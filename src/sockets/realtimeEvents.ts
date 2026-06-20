import { io } from './socketServer.js';
import * as chatService from '../services/chatService.js';
import * as solicitudService from '../services/solicitudService.js';

export interface SolicitudDeletedEvent {
  solicitudId: string;
  opportunityId: string;
  ownerId: string;
  interestedUserId: string;
}

const emitToUserIfAvailable = (userId: string, eventName: string, payload: unknown): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(eventName, payload);
};

export const emitChatUpdated = async (chatId: string): Promise<void> => {
  if (!io) return;

  const chat = await chatService.obtenerChatDetalladoPorId(chatId);
  if (!chat) return;

  const ownerId = typeof chat.owner === 'object' ? String(chat.owner._id) : String(chat.owner);
  const interestedId = typeof chat.interested === 'object' ? String(chat.interested._id) : String(chat.interested);

  emitToUserIfAvailable(ownerId, 'chat_updated', chat);
  emitToUserIfAvailable(interestedId, 'chat_updated', chat);
  io.to(`chat:${chatId}`).emit('chat_updated', chat);
};

export const emitSolicitudUpdated = async (solicitudId: string): Promise<void> => {
  if (!io) return;

  const solicitud = await solicitudService.obtenerSolicitudRealtime(solicitudId);
  if (!solicitud) return;

  const ownerId = typeof solicitud.owner === 'object' ? String(solicitud.owner._id) : String(solicitud.owner);
  const interestedUserId =
    typeof solicitud.interestedUser === 'object'
      ? String(solicitud.interestedUser._id)
      : String(solicitud.interestedUser);

  emitToUserIfAvailable(ownerId, 'solicitud_updated', solicitud);
  emitToUserIfAvailable(interestedUserId, 'solicitud_updated', solicitud);
};

export const emitSolicitudDeleted = (payload: SolicitudDeletedEvent): void => {
  emitToUserIfAvailable(payload.ownerId, 'solicitud_deleted', payload);
  emitToUserIfAvailable(payload.interestedUserId, 'solicitud_deleted', payload);
};
