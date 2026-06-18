import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as chatService from '../services/chatService.js';
import * as ratingService from '../services/ratingService.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/AppError.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotificacionModel } from '../models/notificacionModel.js';

// ─────────────────────────────────────────────
//  POST /api/chats
//  Crea o recupera un chat existente para (oferta + interesado)
//  ─────────────────────────────────────────────
export const getOrCreateChat = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const callerId = req.user!.id;
  const { ofertaId, interestedId } = req.body;

  if (!ofertaId) {
    throw new ValidationError('ofertaId es requerido');
  }

  // Verificar que la oferta existe
  const ownerId = await chatService.verificarOfertaYObtenerPropietario(ofertaId);
  if (!ownerId) {
    throw new NotFoundError('Oferta no encontrada');
  }

  const isCallerOwner = String(ownerId) === String(callerId);

  // Determinar quién es el interesado:
  // - Si el que llama es el dueño, debe haber pasado el ID del interesado.
  // - Si el que llama no es el dueño, el interesado es él mismo.
  const targetInterestedId = isCallerOwner ? interestedId : callerId;

  if (!targetInterestedId) {
    throw new ValidationError('interestedId es requerido cuando el propietario inicia el chat');
  }

  if (String(ownerId) === String(targetInterestedId)) {
    throw new ForbiddenError('No puedes iniciar un chat contigo mismo');
  }

  // VERIFICACIÓ: Si existeix una sol·licitud ACCEPTADA, el xat s'aprova automàticament
  const solicitudAceptada = await chatService.existeSolicitudAceptada(ofertaId, targetInterestedId);

  // Upsert: un solo chat por par (oferta + interested)
  const chat = await chatService.crearOObtenerChat(ofertaId, ownerId, targetInterestedId, solicitudAceptada);

  const statusCode = chat.createdAt?.getTime() === chat.updatedAt?.getTime() ? 201 : 200;
  res.status(statusCode).json(chat);
});

// ─────────────────────────────────────────────
//  GET /api/chats
//  Mis chats activos (como owner o como interested)
//  ─────────────────────────────────────────────
export const getMyChats = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  const chats = await chatService.obtenerChatsPorUsuario(userId);

  res.status(200).json(chats);
});

// ─────────────────────────────────────────────
//  GET /api/chats/:chatId/messages
//  Historial con paginación por cursor temporal
//  Query params: ?limit=30&before=<ISO_date>
//  ─────────────────────────────────────────────
export const getChatMessages = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const { chatId } = req.params;
  const limit = Math.min(parseInt(req.query['limit'] as string) || 30, 100);
  const before = req.query['before'] as string | undefined;

  const mensajes = await chatService.obtenerMensajesPorChat(chatId, limit, before);

  // Return in chronological order (oldest first) for UI rendering
  res.status(200).json(mensajes.reverse());
});

// ─────────────────────────────────────────────
//  PATCH /api/chats/:chatId/read
//  Marca los mensajes como leídos (reset unread counter)
//  ─────────────────────────────────────────────
export const markChatAsRead = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { chatId } = req.params;

  const chat = await chatService.obtenerChatBasicoPorId(chatId);
  if (!chat) {
    throw new NotFoundError('Chat no encontrado');
  }

  const isOwner = String(chat.owner) === userId;
  const isInterested = String(chat.interested) === userId;

  if (!isOwner && !isInterested) {
    throw new ForbiddenError('No autorizado');
  }

  const resetField = isOwner ? { unreadOwner: 0 } : { unreadInterested: 0 };
  await chatService.resetearContadorNoLeidos(chatId, resetField);

  // Marcar las notificaciones del chat como leídas en la base de datos
  await NotificacionModel.updateMany(
    { userId, type: 'chat', 'metadata.chatId': chatId, read: false },
    { $set: { read: true } }
  );

  res.status(200).json({ ok: true });
});

// ─────────────────────────────────────────────
//  PATCH /api/chats/:chatId/readonly
//  Marca un chat como solo lectura (llamado cuando se borra una oferta)
//  Solo el owner o admin puede hacerlo
// ─────────────────────────────────────────────
export const setChatReadOnly = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { chatId } = req.params;

  const chat = await chatService.obtenerChatBasicoPorId(chatId);
  if (!chat) {
    throw new NotFoundError('Chat no encontrado');
  }

  const isOwner = String(chat.owner) === userId;
  const isAdmin = req.user!.roles.includes('ADMIN');

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('No autorizado');
  }

  await chatService.marcarChatSoloLectura(chatId);
  res.status(200).json({ ok: true });
});

// ─────────────────────────────────────────────
//  PATCH /api/chats/:chatId/status
//  Permite al receptor (owner) aceptar o rechazar un chat pendiente
// ─────────────────────────────────────────────
export const updateChatStatus = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { chatId } = req.params;
  const { status } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ValidationError('Estado no válido');
  }

  const chat = await chatService.obtenerChatBasicoPorId(chatId);
  if (!chat) {
    throw new NotFoundError('Chat no encontrado');
  }

  // Solo el owner puede aprobar un chat iniciado por un interesado
  if (String(chat.owner) !== userId) {
    throw new ForbiddenError('No autorizado para cambiar el estado del xat');
  }

  const updated = await chatService.actualizarEstadoChat(chatId, status);

  res.status(200).json(updated);
});

// ─────────────────────────────────────────────
//  POST /api/chats/:chatId/close
//  Marca la venta como cerrada por el participante actual.
// ─────────────────────────────────────────────
export const closeDeal = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { chatId } = req.params;

  const chat = await chatService.obtenerChatBasicoPorId(chatId);
  if (!chat) {
    throw new NotFoundError('Chat no encontrado');
  }

  const isOwner = String(chat.owner) === userId;
  const isInterested = String(chat.interested) === userId;
  const isAdmin = req.user!.roles.includes('ADMIN');
  if (!isOwner && !isInterested && !isAdmin) {
    throw new ForbiddenError('No autorizado');
  }

  const updated = await chatService.cerrarVentaChat(chatId, userId);
  if (!updated) {
    throw new ForbiddenError('No autorizado');
  }

  res.status(200).json(updated);
});

export const getMyChatRating = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { chatId } = req.params;
  const rating = await ratingService.obtenerMiRatingDeChat(chatId, userId);
  res.status(200).json({ rating });
});

export const rateChat = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { chatId } = req.params;
  const { score, comment } = req.body;

  if (typeof score !== 'number') {
    throw new ValidationError('La valoracion es requerida');
  }

  const rating = await ratingService.valorarChat(chatId, userId, score, comment);
  res.status(200).json(rating);
});
