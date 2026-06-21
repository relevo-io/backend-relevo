import { Router } from 'express';
import { authenticateToken, authorizeChatParticipant, authorizeRoles } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import {
  getOrCreateChat,
  getMyChats,
  getAllChatsAdmin,
  getChatMessages,
  markChatAsRead,
  setChatReadOnly,
  updateChatStatus,
  closeDeal,
  setPostCloseGuidanceDecision,
  getMyChatRating,
  rateChat
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

router.get('/admin/all', authorizeRoles('ADMIN'), asyncWrapper(getAllChatsAdmin));

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

/**
 * @openapi
 * components:
 *   schemas:
 *     Rating:
 *       type: object
 *       required:
 *         - chat
 *         - fromUser
 *         - toUser
 *         - ratedRole
 *         - score
 *       properties:
 *         _id:
 *           type: string
 *           description: ID únic de la valoració en format ObjectId
 *           example: '65f2c3d4e5f6a7b8c9d0e1f2'
 *         chat:
 *           type: string
 *           description: ID del xat associat
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         fromUser:
 *           type: string
 *           description: ID de l'usuari que realitza la valoració
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         toUser:
 *           type: string
 *           description: ID de l'usuari valorat
 *           example: '64f1a2b3c4d5e6f7a8b9c0d2'
 *         ratedRole:
 *           type: string
 *           enum: [OWNER, INTERESTED]
 *           description: Rol del destí de la valoració
 *           example: 'INTERESTED'
 *         score:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Puntuació de 1 a 5
 *           example: 5
 *         comment:
 *           type: string
 *           maxLength: 600
 *           description: Comentari addicional (opcional)
 *           example: 'Molt bon tracte i comunicació fluida.'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/chats/{chatId}/close:
 *   post:
 *     summary: Tanca la venda o tracte associat al xat pel participant actual
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB del xat
 *     responses:
 *       200:
 *         description: Estat del tancament actualitzat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Xat no trobat
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:chatId/close', authorizeChatParticipant, asyncWrapper(closeDeal));

/**
 * @openapi
 * /api/chats/{chatId}/post-close-guidance:
 *   post:
 *     summary: Registra la decisió de l'usuari sobre el programa de guia/acompanyament post-tancament
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB del xat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [ACCEPTED, DISMISSED]
 *                 description: Decisió respecte al guiatge post-cierre
 *                 example: ACCEPTED
 *     responses:
 *       200:
 *         description: Decisió registrada correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Paràmetres invàlids o la venda encara no està tancada
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Xat no trobat
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:chatId/post-close-guidance', authorizeChatParticipant, asyncWrapper(setPostCloseGuidanceDecision));

/**
 * @openapi
 * /api/chats/{chatId}/my-rating:
 *   get:
 *     summary: Obté la valoració que l'usuari actual ha donat a l'altre usuari en aquest xat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB del xat
 *     responses:
 *       200:
 *         description: Valoració obtinguda (pot ser null si no s'ha valorat)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rating:
 *                   anyOf:
 *                     - $ref: '#/components/schemas/Rating'
 *                     - type: 'null'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Xat no trobat
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:chatId/my-rating', authorizeChatParticipant, asyncWrapper(getMyChatRating));

/**
 * @openapi
 * /api/chats/{chatId}/rating:
 *   post:
 *     summary: Valora l'altre usuari d'aquest xat indicant puntuació i comentari
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB del xat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - score
 *             properties:
 *               score:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Puntuació atorgada (1-5)
 *                 example: 5
 *               comment:
 *                 type: string
 *                 maxLength: 600
 *                 description: Comentari de feedback
 *                 example: 'Perfecte'
 *     responses:
 *       200:
 *         description: Valoració creada o actualitzada correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Paràmetres invàlids
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Xat no trobat
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:chatId/rating', authorizeChatParticipant, asyncWrapper(rateChat));

export default router;
