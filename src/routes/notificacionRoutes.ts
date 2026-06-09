import { Router } from 'express';
import * as notificacionController from '../controllers/notificacionController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas de notificaciones requieren autenticación
router.use(authenticateToken);

/**
 * @openapi
 * tags:
 *   - name: Notificaciones
 *     description: Endpoints del centro de historial de notificaciones in-app
 */

/**
 * @openapi
 * /api/notificaciones:
 *   get:
 *     summary: Obtiene el historial de notificaciones paginado del usuario autenticado
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página a recuperar
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *         description: Cantidad de notificaciones por página
 *     responses:
 *       200:
 *         description: Historial de notificaciones recuperado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notificacion'
 *                 unreadCount:
 *                   type: integer
 *                   description: Total de notificaciones sin leer del usuario
 *                   example: 3
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: No autorizado
 */
router.get('/', notificacionController.getNotificaciones);

/**
 * @openapi
 * /api/notificaciones/read-all:
 *   patch:
 *     summary: Marca todas las notificaciones del usuario como leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificaciones marcadas como leídas con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Todas las notificaciones marcadas como leídas'
 *       401:
 *         description: No autorizado
 */
router.patch('/read-all', notificacionController.markAllAsRead);

/**
 * @openapi
 * /api/notificaciones/read-by-type:
 *   patch:
 *     summary: Marca todas las notificaciones de un tipo específico como leídas
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [chat, solicitud, cv_analysis]
 *                 description: Tipo de notificaciones a marcar como leídas
 *                 example: 'solicitud'
 *     responses:
 *       200:
 *         description: Notificaciones del tipo indicado marcadas como leídas con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Notificaciones de tipo solicitud marcadas como leídas'
 *       400:
 *         description: Petición inválida (tipo faltante)
 *       401:
 *         description: No autorizado
 */
router.patch('/read-by-type', notificacionController.markReadByType);

/**
 * @openapi
 * /api/notificaciones/{id}/read:
 *   patch:
 *     summary: Marca una única notificación como leída por ID
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación
 *     responses:
 *       200:
 *         description: Notificación marcada como leída exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 notification:
 *                   $ref: '#/components/schemas/Notificacion'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Notificación no encontrada
 */
router.patch('/:id/read', notificacionController.markAsRead);

/**
 * @openapi
 * /api/notificaciones:
 *   delete:
 *     summary: Elimina todas las notificaciones del usuario (vaciar bandeja)
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial de notificaciones vaciado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Historial de notificaciones vaciado'
 *       401:
 *         description: No autorizado
 */
router.delete('/', notificacionController.clearAllNotificaciones);

/**
 * @openapi
 * /api/notificaciones/{id}:
 *   delete:
 *     summary: Elimina físicamente una única notificación por ID
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la notificación a eliminar
 *     responses:
 *       200:
 *         description: Notificación eliminada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Notificación eliminada correctamente'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Notificación no encontrada
 */
router.delete('/:id', notificacionController.deleteNotificacion);

export default router;
