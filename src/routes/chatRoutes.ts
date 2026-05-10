import { Router } from 'express';
import { authenticateToken, authorizeChatParticipant } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import {
  getOrCreateChat,
  getMyChats,
  getChatMessages,
  markChatAsRead,
  setChatReadOnly,
  updateChatStatus
} from '../controllers/chatController.js';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken);

/**
 * POST /api/chats
 * Crea o recupera el chat entre el usuario autenticado y el owner de la oferta.
 * Body: { ofertaId: string }
 */
router.post('/', asyncWrapper(getOrCreateChat));

/**
 * GET /api/chats
 * Retorna todos los chats activos donde el usuario es owner o interested.
 * Ordenados por updatedAt desc.
 */
router.get('/', asyncWrapper(getMyChats));

/**
 * GET /api/chats/:chatId/messages
 * Retorna el historial de mensajes con paginación por cursor.
 * Query: ?limit=30&before=<ISO_date>
 */
router.get('/:chatId/messages', authorizeChatParticipant, asyncWrapper(getChatMessages));

/**
 * PATCH /api/chats/:chatId/read
 * Marca los mensajes de este chat como leídos para el usuario autenticado.
 */
router.patch('/:chatId/read', authorizeChatParticipant, asyncWrapper(markChatAsRead));

/**
 * PATCH /api/chats/:chatId/readonly
 * Marca el chat como solo lectura (cuando la oferta se finaliza o elimina).
 * Solo el owner o admin pueden hacerlo.
 */
router.patch('/:chatId/readonly', asyncWrapper(setChatReadOnly));

/**
 * PATCH /api/chats/:chatId/status
 * Permet aprovar o rebutjar un xat (nomes owner)
 */
router.patch('/:chatId/status', asyncWrapper(updateChatStatus));

export default router;
