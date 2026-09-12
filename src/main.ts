import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';
import routes from './routes/index.ts';
import { errorHandler } from './middlewares/errorHandler.middleware.ts';
import { orderLiveSyncRouter } from './gateways/orderLiveSync.gateway.ts';
import { connectDB } from './lib/prisma.ts';

// 🛡️ ==========================================================
// ZERO-CRASH PROCESS SHIELD: Prevents entire server shutdown
// on dropped SSE connections, client closes, or broken pipes
// ==========================================================
process.on('uncaughtException', (err: any) => {
  if (
    err?.code === 'EPIPE' ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'ERR_STREAM_WRITE_AFTER_END' ||
    err?.code === 'ECANCELED' ||
    err?.message?.includes('write after end')
  ) {
    // Gracefully ignore closed client streams — keeps server running 24/7
    return;
  }
  console.error('[Process Shield] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Process Shield] Unhandled Rejection:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================================
// ROBUST ENVIRONMENT LOADING
// ===================================
// Try multiple .env paths to handle tsx (dev), production builds, and
// VPS deployment scenarios where CWD may differ from project root.
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

const app = express();
// 🌟 Accept dynamic PORT assigned by OpenLiteSpeed appserver (lsnode)
const PORT = Number(process.env.PORT) || 3005;
const isProduction = process.env.NODE_ENV === 'production';

// ===================================
// 1. TRUST PROXY
// Required for accurate client IP resolution behind Nginx / CyberPanel /
// Contabo VPS reverse proxies. Without this, rate limiting and logging
// will see the proxy IP instead of the real client IP.
// ===================================
app.set('trust proxy', 1);
console.log(`🔒 Trust proxy enabled (${isProduction ? 'production' : 'development'})`);

// ===================================
// 2. HEADER DE-DUPLICATION GUARD
// Prevents duplicate Access-Control-Allow-Origin / Vary headers caused by
// Nginx + Express both adding them. Intercepts res.writeHead to collapse
// any duplicated header values into a single value before flushing.
// ===================================
app.use((_req, res, next) => {
  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = function (this: typeof res, statusCode: number, ...args: any[]) {
    const dedupe = (name: string) => {
      const val = res.getHeader(name);
      if (val) {
        const first = Array.isArray(val)
          ? String(val[0])
          : String(val).split(',')[0];
        res.setHeader(name, first.trim());
      }
    };
    dedupe('Access-Control-Allow-Origin');
    dedupe('Vary');
    return originalWriteHead.call(this, statusCode, ...args);
  } as typeof res.writeHead;
  next();
});

// ===================================
// 3. REQUEST ID FOR TRACING
// ===================================
app.use((req, _res, next) => {
  (req as any).requestId = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// ===================================
// 4. SECURITY HEADERS (HELMET)
// ===================================
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));

// ===================================
// 5. CUSTOM CORS (NO STANDARD CORS MIDDLEWARE)
// No `cors()` package — we build it manually to prevent duplicate headers
// with Nginx reverse proxy. Nginx + cors() both emit Access-Control-Allow-Origin,
// causing CORS errors. This implementation uses setHeaderClean() which calls
// res.removeHeader() before setHeader(), guaranteeing zero duplicates.
// ===================================
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;

  // Localhost / Dev origins
  if (/^https?:\/\/localhost(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return true;

  // Production domains from environment
  const frontendUrl = process.env.FRONTEND_URL || '';
  if (frontendUrl && origin.toLowerCase() === frontendUrl.toLowerCase()) return true;

  // Custom production domain patterns
  if (/\.ecosystemlk\.app$/i.test(origin)) return true;

  return false;
}

function setHeaderClean(res: express.Response, name: string, value: string): void {
  res.removeHeader(name);
  res.setHeader(name, value);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  setHeaderClean(res, 'Vary', 'Origin');
  setHeaderClean(res, 'Access-Control-Allow-Origin', (origin && isOriginAllowed(origin)) ? origin : '');
  setHeaderClean(res, 'Access-Control-Allow-Credentials', 'true');
  setHeaderClean(res, 'Access-Control-Expose-Headers', 'Set-Cookie, X-Request-ID');

  if (req.method === 'OPTIONS') {
    setHeaderClean(res, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    setHeaderClean(res, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, Cache-Control, Pragma, Expires');
    setHeaderClean(res, 'Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  next();
});

// ===================================
// 6. COMPRESSION (GZIP)
// Compresses responses > 1KB. Must be registered BEFORE body parsers.
// ===================================
app.use(compression({ threshold: 1024 }));

// ===================================
// 7. BODY PARSERS
// ===================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===================================
// 8. COOKIE PARSER (for refresh token cookies)
// ===================================
app.use(cookieParser());

// ===================================
// 9. ADDITIONAL SECURITY RESPONSE HEADERS
// ===================================
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (isProduction) {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  next();
});

// ===================================
// 10. STATIC FILE SERVING (UPLOADS)
// ===================================
// Enable Cross-Origin Resource Sharing for static upload directory
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.join(__dirname, '../public/uploads'))
);
app.use('/api/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ===================================
// 11. HEALTH CHECK — instant response, never opens DB connection
// ===================================
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Senari Restaurant API is running',
    timestamp: new Date().toISOString(),
  });
});

// ===================================
// 12. API STATUS LANDING PAGE (/api/test)
// Glassmorphism dark theme showing server status, environment, DB state,
// and Sri Lanka local timestamp (Asia/Colombo)
// ===================================
function renderStatusPage(): string {
  const currentTime = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senari Restaurant API - Status</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
      overflow: hidden;
      padding: 1rem;
    }
    .bg-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
      z-index: 0;
    }
    .bg-orb-1 {
      width: 500px; height: 500px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      top: -200px; right: -200px;
      opacity: 0.3;
      animation: floatOrb 8s ease-in-out infinite alternate;
    }
    .bg-orb-2 {
      width: 400px; height: 400px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      bottom: -150px; left: -150px;
      opacity: 0.25;
      animation: floatOrb 10s ease-in-out infinite alternate-reverse;
    }
    @keyframes floatOrb {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(40px, 60px) scale(1.15); }
    }
    .container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 560px;
      animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(40px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .status-card {
      background: rgba(30, 27, 75, 0.5);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      padding: 3rem 2.5rem;
      text-align: center;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6);
    }
    .icon-wrapper {
      width: 80px; height: 80px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15));
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      animation: float 3s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #f8fafc 0%, #10b981 50%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 0.75rem;
    }
    .subtitle {
      font-size: 1rem;
      color: #94a3b8;
      margin-bottom: 2rem;
      font-weight: 500;
    }
    .status-row {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 2rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 100px;
      margin-bottom: 2rem;
    }
    .status-dot {
      width: 14px; height: 14px;
      background: #10b981;
      border-radius: 50%;
      position: relative;
      flex-shrink: 0;
      animation: pulseGlow 2s ease-in-out infinite;
    }
    .status-dot::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.2);
      animation: pulseGlow 2s ease-in-out infinite;
    }
    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 8px rgba(16, 185, 129, 0.6), 0 0 20px rgba(16, 185, 129, 0.3); transform: scale(1); }
      50% { box-shadow: 0 0 16px rgba(16, 185, 129, 0.8), 0 0 40px rgba(16, 185, 129, 0.4); transform: scale(1.08); }
    }
    .status-text {
      font-size: 1.25rem;
      font-weight: 700;
      color: #10b981;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.875rem;
      margin-bottom: 1.5rem;
    }
    .meta-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 1rem;
      text-align: left;
      transition: transform 0.25s ease, background 0.25s ease;
    }
    .meta-item:hover {
      transform: translateY(-3px);
      background: rgba(255, 255, 255, 0.06);
    }
    .meta-label {
      font-size: 0.7rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
      margin-bottom: 0.35rem;
    }
    .meta-value {
      font-size: 0.95rem;
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .db-indicator {
      width: 8px; height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .db-indicator.connected { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6); }
    .db-indicator.disconnected { background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.6); }
    .timestamp-row {
      text-align: center;
      color: #64748b;
      font-size: 0.85rem;
      padding: 1rem 0 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .timestamp-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #475569;
      margin-bottom: 0.25rem;
    }
    @media (max-width: 500px) {
      .status-card { padding: 2rem 1.5rem; }
      h1 { font-size: 1.6rem; }
      .meta-grid { grid-template-columns: 1fr; }
      .status-row { padding: 0.75rem 1.25rem; }
    }
  </style>
</head>
<body>
  <div class="bg-orb bg-orb-1"></div>
  <div class="bg-orb bg-orb-2"></div>
  <div class="container">
    <div class="status-card">
      <div class="icon-wrapper">🏮</div>
      <h1>Senari Restaurant API</h1>
      <p class="subtitle">Express REST API Server is Active</p>
      <div class="status-row">
        <span class="status-dot"></span>
        <span class="status-text">Server API is Working!</span>
      </div>
      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Environment</div>
          <div class="meta-value">${process.env.NODE_ENV || 'development'}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Server</div>
          <div class="meta-value">Senari Hotel</div>
        </div>
      </div>
      <div class="timestamp-row">
        <div class="timestamp-label">Sri Lanka Time (Asia/Colombo)</div>
        ${currentTime}
      </div>
    </div>
  </div>
</body>
</html>`;
}

app.get('/api/test', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(renderStatusPage());
});

// ===================================
// 13. API ROUTES & SSE GATEWAY MOUNT
// ===================================
// 🌟 Mount Live POS persistent sync stream (Supports both /api/sync and /api/live-sync for frontend compatibility)
app.use('/api/sync', orderLiveSyncRouter);
app.use('/api/live-sync', orderLiveSyncRouter);

// Standard API routes (foods, orders, invoices, categories, etc.)
app.use('/api', routes);

// ===================================
// 14. GLOBAL ERROR HANDLER (must be after routes)
// ===================================
app.use(errorHandler);

// ===================================
// 15. HTTP SERVER STARTUP & OPENLITESPEED EXPORT
// ===================================
const server = http.createServer(app);

// 🛡️ OpenLiteSpeed lsnode socket configuration
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 0;

// Verified startup: Checks database connection before accepting requests
async function startServer() {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Senari Restaurant API running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`📡 Status page at http://localhost:${PORT}/api/test`);
      console.log(`❤️  Health check at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server due to database connection failure:', error);
    process.exit(1);
  }
}

startServer();

// 🌟 Ultra Smart pattern: Required for OpenLiteSpeed appserver integration
export default app;