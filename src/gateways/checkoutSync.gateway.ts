import { Router, Request, Response } from 'express';

interface SseClient {
  id: string;
  tenantId: string;
  terminalId: string;
  userRole: string;
  res: Response;
}

const rooms = new Map<string, Map<string, SseClient>>();
const roomStates = new Map<string, any>();

function getRoomKey(tenantId: string, terminalId: string): string {
  return `${tenantId}:${terminalId}`;
}

/**
 * 🌟 SSE Broadcast Utility Function
 * ඕනෑම Controller එකකින් හෝ Service එකකින් orders/invoices sync කිරීමට මෙය භාවිත කරයි
 */
export function broadcastToRoom(roomKey: string, event: string, payload: any, senderClientId?: string) {
  const room = rooms.get(roomKey);
  if (!room) return;

  const data = JSON.stringify({ event, payload });
  room.forEach((client) => {
    // තමන්ගේම update එක තමන්ට නැවත නොයැවීම
    if (senderClientId && client.id === senderClientId) return;
    try {
      if (client.res.writable && !client.res.writableEnded) {
        client.res.write(`data: ${data}\n\n`);
      }
    } catch {
      // Stream error silent bypass
    }
  });
}

function emitPeerCount(roomKey: string) {
  const room = rooms.get(roomKey);
  const count = room ? room.size : 0;
  broadcastToRoom(roomKey, 'session_peers', { count });
}

export const syncRouter = Router();

// 1. Client Browser එක සම්බන්ධ වන තැන (Leak-Proof Safe SSE Stream)
syncRouter.get('/stream', (req: Request, res: Response) => {
  const tenantId = String(req.query.tenantId || 'default-tenant').trim();
  const terminalId = String(req.query.terminalId || 'SHOP').trim();
  const userRole = String(req.query.userRole || 'unknown').trim();
  const clientId = String(req.query.clientId || Math.random().toString(36).slice(2)).trim();

  // 🛡️ 1. Dead Socket / Ghost TCP Connection වීම වැළැක්වීමට OS Keep-Alive Settings
  req.socket.setKeepAlive(true, 10000);
  req.socket.setNoDelay(true);
  req.socket.setTimeout(0);

  // 🌟 OLS Reverse Proxy එකට buffer නොකර stream කිරීමට Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const roomKey = getRoomKey(tenantId, terminalId);
  if (!rooms.has(roomKey)) {
    rooms.set(roomKey, new Map());
  }

  const client: SseClient = { id: clientId, tenantId, terminalId, userRole, res };
  rooms.get(roomKey)!.set(clientId, client);

  // Connection සාර්ථක බව සහ Initial State යැවීම
  const currentState = roomStates.get(roomKey);
  const initialPayload = currentState ? { status: 'ok', initialState: currentState } : { status: 'ok' };
  res.write(`data: ${JSON.stringify({ event: 'connected', payload: initialPayload })}\n\n`);
  emitPeerCount(roomKey);

  // 🛡️ 2. Bulletproof Resource Cleanup & Socket Destruction Function
  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    clearInterval(keepAlive);

    const room = rooms.get(roomKey);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        rooms.delete(roomKey);
        roomStates.delete(roomKey);
      } else {
        emitPeerCount(roomKey);
      }
    }

    try {
      if (!res.writableEnded) res.end();
      req.socket.destroy(); // 🌟 Dead TCP Socket එක Linux Kernel එකෙන් ක්ෂණිකව Destroy කර RAM එක නිදහස් කරයි
    } catch {
      // ignore
    }
  };

  // 🛡️ 3. Safe Heartbeat (Socket එක Dead නම් Server එක Hang නොවී ක්ෂණිකව Clean කිරීම)
  const keepAlive = setInterval(() => {
    if (res.writableEnded || !res.writable) {
      cleanup();
      return;
    }
    const writeOk = res.write(':\n\n');
    if (!writeOk) {
      cleanup();
    }
  }, 20000);

  // 🛡️ 4. පරිගණකය Shutdown කළත් හෝ Network කැඩුනත් සියලු Disconnect Events අල්ලා ගැනීම
  req.on('close', cleanup);
  req.on('end', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
  res.on('finish', cleanup);
});

// 2. Cart එකේ වෙනස්කම් යවන API එක (Frontend -> POST)
syncRouter.post('/broadcast-cart', (req: Request, res: Response) => {
  const { tenantId = 'default-tenant', terminalId = 'SHOP', payload } = req.body;
  if (!payload) return res.status(400).json({ error: 'Missing payload' });

  const roomKey = getRoomKey(tenantId, terminalId);
  const existingState = roomStates.get(roomKey);

  // කාමරයේ දැනටමත් බඩු තිබියදී අලුතින් ආ කෙනෙකුගේ හිස් state එකකින් overwrite වීම වැළැක්වීම
  if (payload.items?.length === 0 && existingState && existingState.items?.length > 0) {
    // ignore wipe
  } else {
    roomStates.set(roomKey, payload);
  }

  broadcastToRoom(roomKey, 'sync_cart_state', payload, payload.originClientId);
  return res.status(200).json({ success: true });
});

// 3. Pre-Order හෝ බිල අවසන් කළ විට යවන API එක (Frontend -> POST)
syncRouter.post('/broadcast-invoice', (req: Request, res: Response) => {
  const { tenantId = 'default-tenant', terminalId = 'SHOP', payload } = req.body;
  if (!payload) return res.status(400).json({ error: 'Missing payload' });

  const roomKey = getRoomKey(tenantId, terminalId);
  roomStates.delete(roomKey); // Cart State එක Clear කිරීම

  broadcastToRoom(roomKey, 'invoice_finalized', payload, payload.originClientId);
  return res.status(200).json({ success: true });
});