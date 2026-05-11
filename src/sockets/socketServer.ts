import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import { IJwtPayload } from '../models/JwtPayload.js';
import { registerChatHandlers } from './chatHandler.js';
import { logger } from '../config.js';

// ─────────────────────────────────────────────
//  Extend Socket.io SocketData interface
// ─────────────────────────────────────────────

declare module 'socket.io' {
  interface SocketData {
    user: IJwtPayload;
    activeChatId?: string;
  }
}

// ─────────────────────────────────────────────
//  Socket.io server initialization
// ─────────────────────────────────────────────

export let io: SocketIOServer;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (_origin, callback) => callback(null, true),
      credentials: true
    },
    // Ping interval & timeout for connection health
    pingInterval: 25000,
    pingTimeout: 10000
  });

  // ── Authentication middleware ──────────────────
  // JWT travels in socket.handshake.auth.token (NOT in query params)
  io.use((socket: Socket, next) => {
    const rawToken: string | undefined = socket.handshake.auth?.token;

    if (!rawToken) {
      logger.warn('[Socket] Connection rejected — no token provided');
      return next(new Error('Authentication error: token required'));
    }

    // Strip "Bearer " prefix if present
    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      logger.info('[Socket] User connected: %s (%s)', payload.fullName, socket.id);
      next();
    } catch {
      logger.warn('[Socket] Connection rejected — invalid token');
      next(new Error('Authentication error: invalid token'));
    }
  });

  // ── Register handlers per connection ──────────────
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user.id;
    socket.join(`user:${userId}`);
    logger.info('[Socket] User joined personal room: user:%s', userId);

    registerChatHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info('[Socket] User disconnected: %s — reason: %s', socket.data.user?.fullName, reason);
    });
  });

  logger.info('[Socket] Socket.io server initialized');
  return io;
}
