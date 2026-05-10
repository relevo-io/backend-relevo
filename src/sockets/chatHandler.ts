import { Server as SocketIOServer, Socket } from 'socket.io';
import sanitizeHtml from 'sanitize-html';
import { ChatModel } from '../models/chatModel.js';
import { MensajeModel } from '../models/mensajeModel.js';
import { logger } from '../config.js';

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 2000;
const TYPING_DEBOUNCE_MS = 3000; // Auto-stop typing after 3s

// Map of active typing timers per socket
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ─────────────────────────────────────────────
//  Room helpers
// ─────────────────────────────────────────────

const roomName = (chatId: string) => `chat:${chatId}`;

// ─────────────────────────────────────────────
//  Sanitize helper (anti-XSS)
// ─────────────────────────────────────────────

function sanitizeContent(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: [], // No HTML allowed — plain text only
    allowedAttributes: {}
  }).trim();
}

// ─────────────────────────────────────────────
//  Chat event handlers
// ─────────────────────────────────────────────

export function registerChatHandlers(io: SocketIOServer, socket: Socket): void {
  const userId = socket.data.user?.id;

  // ── join_chat ────────────────────────────────
  // Client emits: { chatId: string }
  // Server validates DB membership before joining room
  socket.on('join_chat', async (payload: { chatId: string }, callback?: (res: unknown) => void) => {
    try {
      const { chatId } = payload ?? {};

      if (!chatId) {
        return callback?.({ ok: false, error: 'chatId requerido' });
      }

      // Security: verify participant in DB before joining room
      const chat = await ChatModel.findById(chatId).select('owner interested').lean();

      if (!chat) {
        return callback?.({ ok: false, error: 'Chat no encontrado' });
      }

      const isOwner = String(chat.owner) === String(userId);
      const isInterested = String(chat.interested) === String(userId);
      const isParticipant = isOwner || isInterested;

      if (!isParticipant) {
        logger.warn('[Socket] join_chat rejected — user %s is not participant of chat %s', userId, chatId);
        socket.emit('error', { message: 'No autorizado para este chat' });
        return callback?.({ ok: false, error: 'Forbidden' });
      }

      // Leave previous active chat room if any
      if (socket.data.activeChatId && socket.data.activeChatId !== chatId) {
        const prevRoom = roomName(socket.data.activeChatId);
        socket.leave(prevRoom);
        socket.to(prevRoom).emit('user_offline', { userId });
      }

      // Join new room
      const room = roomName(chatId);
      await socket.join(room);
      socket.data.activeChatId = chatId;

      // Notify other participant of online presence
      socket.to(room).emit('user_online', { userId, socketId: socket.id });

      // Check if someone else is in the room to return initial state
      const socketsInRoom = await io.in(room).fetchSockets();
      const isOnline = socketsInRoom.length > 1;

      logger.info('[Socket] User %s joined room %s', userId, room);
      callback?.({ ok: true, isOnline });
    } catch (err) {
      logger.error({ err }, '[Socket] join_chat error');
      callback?.({ ok: false, error: 'Error interno' });
    }
  });

  // ── send_message ─────────────────────────────
  // Client emits: { chatId, content } + ack callback
  // Server: sanitize → persist → update Chat → broadcast → ack
  socket.on('send_message', async (payload: { chatId: string; content: string }, callback?: (res: unknown) => void) => {
    try {
      const { chatId, content: rawContent } = payload ?? {};

      if (!chatId || !rawContent) {
        return callback?.({ ok: false, error: 'chatId y content son requeridos' });
      }

      // Verify participant
      const chat = await ChatModel.findById(chatId).select('owner interested isReadOnly').lean();
      if (!chat) {
        return callback?.({ ok: false, error: 'Chat no encontrado' });
      }

      if (chat.isReadOnly) {
        return callback?.({ ok: false, error: 'Este chat es de solo lectura' });
      }

      const isParticipant = String(chat.owner) === userId || String(chat.interested) === userId;
      if (!isParticipant) {
        return callback?.({ ok: false, error: 'Forbidden' });
      }

      // Sanitize & validate length
      const content = sanitizeContent(rawContent);
      if (!content) {
        return callback?.({ ok: false, error: 'El mensaje no puede estar vacío' });
      }
      if (content.length > MAX_MESSAGE_LENGTH) {
        return callback?.({ ok: false, error: `Máximo ${MAX_MESSAGE_LENGTH} caracteres` });
      }

      // Persist message
      const mensaje = await MensajeModel.create({
        chat: chatId,
        sender: userId,
        content
      });

      // Determine which unread counter to increment
      const isOwner = String(chat.owner) === userId;
      const unreadUpdate = isOwner ? { $inc: { unreadInterested: 1 } } : { $inc: { unreadOwner: 1 } };

      // Update Chat: lastMessage cache + unread counter + updatedAt
      await ChatModel.findByIdAndUpdate(chatId, {
        ...unreadUpdate,
        lastMessage: {
          content,
          senderId: userId,
          sentAt: mensaje.createdAt
        }
      });

      // Build response payload (populate sender info)
      const mensajePopulated = await MensajeModel.findById(mensaje._id).populate('sender', 'fullName').lean();

      // Broadcast to everyone in the room EXCEPT the sender
      socket.to(roomName(chatId)).emit('new_message', mensajePopulated);

      // Acknowledgement — frontend knows message hit the DB
      callback?.({ ok: true, message: mensajePopulated });

      logger.info('[Socket] Message saved in chat %s by user %s', chatId, userId);
    } catch (err) {
      logger.error({ err }, '[Socket] send_message error');
      callback?.({ ok: false, error: 'Error al guardar el mensaje' });
    }
  });

  socket.on('typing_start', (payload: { chatId: string }) => {
    const { chatId } = payload ?? {};
    if (!chatId) return;

    socket.to(roomName(chatId)).emit('typing_start', { userId });

    // Auto-stop after debounce
    const key = `${socket.id}:${chatId}`;
    if (typingTimers.has(key)) clearTimeout(typingTimers.get(key)!);
    typingTimers.set(
      key,
      setTimeout(() => {
        socket.to(roomName(chatId)).emit('typing_stop', { userId });
        typingTimers.delete(key);
      }, TYPING_DEBOUNCE_MS)
    );
  });

  socket.on('typing_stop', (payload: { chatId: string }) => {
    const { chatId } = payload ?? {};
    if (!chatId) return;

    const key = `${socket.id}:${chatId}`;
    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key)!);
      typingTimers.delete(key);
    }
    socket.to(roomName(chatId)).emit('typing_stop', { userId });
  });

  socket.on('leave_chat', (payload: { chatId: string }) => {
    const { chatId } = payload ?? {};
    if (!chatId) return;

    const room = roomName(chatId);
    socket.leave(room);

    if (socket.data.activeChatId === chatId) {
      socket.data.activeChatId = undefined;
    }

    socket.to(room).emit('user_offline', { userId });
  });

  // ── mark_read ────────────────────────────────
  // Resets unread counter for this user in the given chat
  socket.on('mark_read', async (payload: { chatId: string }) => {
    try {
      const { chatId } = payload ?? {};
      if (!chatId) return;

      const chat = await ChatModel.findById(chatId).select('owner interested').lean();
      if (!chat) return;

      const isOwner = String(chat.owner) === userId;
      const isInterested = String(chat.interested) === userId;
      if (!isOwner && !isInterested) return;

      const resetUpdate = isOwner ? { unreadOwner: 0 } : { unreadInterested: 0 };
      await ChatModel.findByIdAndUpdate(chatId, { $set: resetUpdate });
    } catch (err) {
      logger.error({ err }, '[Socket] mark_read error');
    }
  });

  socket.on('disconnect', () => {
    const chatId = socket.data.activeChatId;
    if (chatId) {
      socket.to(roomName(chatId)).emit('user_offline', { userId });
    }

    // Clean up any pending typing timers
    for (const [key] of typingTimers) {
      if (key.startsWith(socket.id)) {
        clearTimeout(typingTimers.get(key)!);
        typingTimers.delete(key);
      }
    }
  });
}
