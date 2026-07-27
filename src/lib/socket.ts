import { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

/**
 * Replicates the same origin validation used in main.ts so Socket.io CORS
 * stays in sync with Express CORS. This prevents mismatches where the
 * Express layer allows an origin but Socket.io rejects it.
 */
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

export function initSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, etc.)
        if (!origin || isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
