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
 * @openapi
 * tags:
 *   name: Chats
 *   description: API per a la missatgeria interna entre usuaris.
 */

/**
 * @openapi
 * /api/chats:
 *   post:
 *     summary: Crea o recupera un xat per a una oferta específica
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ofertaId
 *             properties:
 *               ofertaId:
 *                 type: string
 *                 example: '64f1a2b3c4d5e6f7a8b9c0d3'
 *               interestedId:
 *                 type: string
 *                 description: Opcional (obligatori si el owner inicia el xat)
 *     responses:
 *       201:
 *         description: Xat creat
 *       200:
 *         description: Xat ja existent recuperat
 */
router.post('/', asyncWrapper(getOrCreateChat));

/**
 * @openapi
 * /api/chats:
 *   get:
 *     summary: Obté la llista de xats de l'usuari actual
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista de xats recuperada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chat'
 */
router.get('/', asyncWrapper(getMyChats));

/**
 * @openapi
 * /api/chats/{chatId}/messages:
 *   get:
 *     summary: Obté l'historial de missatges d'un xat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 30
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Llista de missatges recuperada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Mensaje'
 */
router.get('/:chatId/messages', authorizeChatParticipant, asyncWrapper(getChatMessages));

/**
 * @openapi
 * /api/chats/{chatId}/read:
 *   patch:
 *     summary: Marca un xat com a llegit
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xat marcat com a llegit
 */
router.patch('/:chatId/read', authorizeChatParticipant, asyncWrapper(markChatAsRead));

/**
 * @openapi
 * /api/chats/{chatId}/readonly:
 *   patch:
 *     summary: Marca un xat com a només lectura
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estat actualitzat
 */
router.patch('/:chatId/readonly', asyncWrapper(setChatReadOnly));

/**
 * @openapi
 * /api/chats/{chatId}/status:
 *   patch:
 *     summary: Actualitza l'estat d'aprovació d'un xat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *     responses:
 *       200:
 *         description: Estat actualitzat
 */
router.patch('/:chatId/status', asyncWrapper(updateChatStatus));

export default router;
