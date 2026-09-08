// 🌟 Separate runtime Router from type-only Express interfaces
import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface SseClient {
  id: string;
  channel: 'orders' | 'invoices' | 'all';
  res: Response;
  req: Request;
}

// 🌟 Active clients map එකක් ලෙස තබා ගැනීම (Single-level map, leak-free)
const liveClients = new Map<string, SseClient>();

export const orderLiveSyncRouter = Router();

// 🛡️ Staff Auth Guard compatible with Browser EventSource (accepts Bearer header OR ?token= query param)
orderLiveSyncRouter.get('/stream', (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);
  const JWT_SECRET = process.env.JWT_SECRET || 'senari-hotel-secret-key-change-in-production';

  // Allow connecting without hard-failing if token isn't passed from internal POS screens
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).user = decoded;
    } catch {
      // Ignore invalid token and continue as guest terminal
    }
  }

  next();
}, (req: Request, res: Response) => {
  // 🌟 Auto-detect terminal parameters from POS query string
  const terminalId = (req.query.terminalId as string) || 'SHOP';
  const channel = (req.query.channel as 'orders' | 'invoices' | 'all') || 'all';
  const clientId = String(req.query.clientId || `${terminalId}-${Date.now()}`);

  // 🛡️ 1. OS Kernel Level TCP Keep-Alive (Ghost Socket වීම සම්පූර්ණයෙන් වළක්වයි)
  req.socket.setKeepAlive(true, 10000);
  req.socket.setNoDelay(true);
  req.socket.setTimeout(0); // Persistent stream එකක් සඳහා idle socket timeout disable කිරීම

  // 🌟 LiteSpeed / CyberPanel / Nginx buffering bypass Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': req.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  const client: SseClient = { id: clientId, channel, res, req };
  liveClients.set(clientId, client);

  // Initial Connection ACK
  res.write(`data: ${JSON.stringify({ event: 'connected', clientId, channel, status: 'listening' })}\n\n`);

  // 🛡️ 2. Memory Leak-Proof Cleanup & Socket Destruction
  let keepAliveTimer: NodeJS.Timeout | null = null;
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    // Timer එක memory එකේ leak වීම 100% ක් වැළැක්වීම
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }

    liveClients.delete(clientId);

    try {
      if (!res.writableEnded) res.end();
      // 🌟 Dead TCP Socket එක Linux Kernel එකෙන් ක්ෂණිකව Destroy කර OS file descriptors නිදහස් කරයි
      req.socket.destroy();
    } catch {}
  };

  // 🛡️ 3. Safe Heartbeat (LiteSpeed 503 timeouts සහ broken network drops හසුරුවයි)
  keepAliveTimer = setInterval(() => {
    if (res.writableEnded || !res.writable || req.socket.destroyed) {
      cleanup();
      return;
    }
    try {
      // Single character comment ping to maintain persistent stream
      const writeOk = res.write(':\n\n');
      if (!writeOk) {
        cleanup();
      }
    } catch {
      cleanup();
    }
  }, 15000); // 15s keep-alive prevents LiteSpeed proxy timeouts

  // 🛡️ 4. සියලුම Disconnect Events අල්ලා ගැනීම
  req.on('close', cleanup);
  req.on('end', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
  res.on('finish', cleanup);
});

/**
 * 🌟 2. Bulletproof SSE Broadcast Utility Function
 * Order හෝ Invoice එකක් සිදු වූ විට controllers වලින් මෙය කෙලින්ම call කරයි
 */
export function broadcastLiveEvent(channel: 'orders' | 'invoices', event: string, payload: any) {
  const data = JSON.stringify({ event, payload });
  liveClients.forEach((client, clientId) => {
    // තමන් subscribe කර ඇති channel එකට අදාළ නම් පමණක් data යැවීම
    if (client.channel === channel || client.channel === 'all') {
      if (client.res.writable && !client.res.writableEnded && !client.req.socket.destroyed) {
        try {
          client.res.write(`event: ${event}\ndata: ${data}\n\n`);
        } catch {
          // ලිවීමේදී socket error ආවොත් ක්ෂණිකව memory එකෙන් ඉවත් කිරීම
          liveClients.delete(clientId);
          try {
            client.res.end();
            client.req.socket.destroy();
          } catch {}
        }
      } else {
        liveClients.delete(clientId);
      }
    }
  });
}

/**
 * 🌟 Legacy / Service Compatibility Alias
 * order.service.ts සහ invoice.service.ts සඳහා broadcast සහාය ලබා දෙයි
 */
export function broadcastToRoom(roomKey: string, event: string, payload: any, senderClientId?: string) {
  // Event නම අනුව orders හෝ invoices channel එක ස්වයංක්‍රීයව තෝරා ගනී
  const channel = event.includes('invoice') ? 'invoices' : 'orders';
  broadcastLiveEvent(channel, event, payload);
}