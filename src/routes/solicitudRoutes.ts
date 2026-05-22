import { Router } from 'express';
import * as solicitudController from '../controllers/solicitudController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import {
  createSolicitudSchema,
  solicitudIdParamsSchema,
  updateSolicitudSchema,
  updateSolicitudStatusSchema,
  guardarCvSchema
} from '../validators/solicitudValidator.js';
import {
  authenticateToken,
  authorizeRoles,
  authorizeSolicitudOwnerOrAdmin,
  authorizeSolicitudParticipantOrAdmin
} from '../middlewares/auth.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Solicitudes
 *   description: API per a la gestió de sol·licituds d'accés a ofertes.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateSolicitud:
 *       type: object
 *       required:
 *         - opportunityId
 *       properties:
 *         opportunityId:
 *           type: string
 *           description: ID de la oferta
 *           example: '64f1a2b3c4d5e6f7a8b9c0d3'
 *         message:
 *           type: string
 *           maxLength: 1000
 *           example: 'I am interested in this opportunity.'
 *
 *     UpdateSolicitud:
 *       type: object
 *       properties:
 *         owner:
 *           type: string
 *           description: ID de l'usuari propietari
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         interestedUser:
 *           type: string
 *           description: ID de l'usuari interessat
 *           example: '64f1a2b3c4d5e6f7a8b9c0d2'
 *         opportunity:
 *           type: string
 *           description: ID de l'oferta
 *           example: '64f1a2b3c4d5e6f7a8b9c0d3'
 *         status:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED]
 *           example: 'ACCEPTED'
 *         message:
 *           type: string
 *           maxLength: 1000
 *           example: 'Updated message'
 */

/**
 * @openapi
 * /api/solicitudes:
 *   get:
 *     summary: Obté la llista completa de sol·licituds
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista de sol·licituds recuperada correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Solicitud'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticateToken, authorizeRoles('ADMIN'), solicitudController.getSolicitudes);

/**
 * @openapi
 * /api/solicitudes/me/recibidas:
 *   get:
 *     summary: Obté la llista de sol·licituds on l'usuari és el propietari de l'oferta
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista de sol·licituds recuperada correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Solicitud'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/me/recibidas',
  authenticateToken,
  authorizeRoles('OWNER', 'ADMIN'),
  solicitudController.getMisSolicitudesOwner
);

/**
 * @swagger
 * /api/solicitudes/me/enviadas:
 *   get:
 *     summary: Obtener solicitudes enviadas por el usuario actual (como interesado)
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de solicitudes enviadas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Solicitud'
 */
router.get(
  '/me/enviadas',
  authenticateToken,
  authorizeRoles('INTERESTED', 'ADMIN'),
  solicitudController.getMisSolicitudesEnviadas
);

/**
 * @swagger
 * /api/solicitudes/oferta/{ofertaId}/me:
 *   get:
 *     summary: Obtener la solicitud del usuario actual para una oferta específica
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ofertaId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Datos de la solicitud o null
 */
router.get('/oferta/:ofertaId/me', authenticateToken, solicitudController.getMiSolicitudPorOferta);

/**
 * @openapi
 * /api/solicitudes/batch:
 *   delete:
 *     summary: Elimina múltiples solicitudes por una lista de IDs
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Borrado múltiple ejecutado
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/batch', authenticateToken, authorizeRoles('ADMIN'), solicitudController.deleteMultiple);

/**
 * @openapi
 * /api/solicitudes/{id}:
 *   get:
 *     summary: Obté una sol·licitud per ID
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sol·licitud a recuperar
 *     responses:
 *       200:
 *         description: Sol·licitud recuperada correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Solicitud'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeSolicitudOwnerOrAdmin,
  validate({ params: solicitudIdParamsSchema }),
  solicitudController.getSolicitud
);

/**
 * @openapi
 * /api/solicitudes:
 *   post:
 *     summary: Crea una nova sol·licitud
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSolicitud'
 *           example:
 *             opportunityId: 64f1a2b3c4d5e6f7a8b9c0d3
 *             message: I am interested in this opportunity.
 *     responses:
 *       201:
 *         description: Sol·licitud creada correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Solicitud'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('INTERESTED', 'ADMIN'),
  validate({ body: createSolicitudSchema }),
  solicitudController.createSolicitud
);

/**
 * @openapi
 * /api/solicitudes/{id}/message:
 *   patch:
 *     summary: Actualitza una sol·licitud per ID
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sol·licitud a actualitzar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSolicitud'
 *           example:
 *             status: ACCEPTED
 *             message: Updated message
 *     responses:
 *       200:
 *         description: Sol·licitud actualitzada correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Solicitud'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/:id/message',
  authenticateToken,
  authorizeSolicitudOwnerOrAdmin,
  validate({
    params: solicitudIdParamsSchema,
    body: updateSolicitudSchema
  }),
  solicitudController.updateSolicitud
);

/**
 * @openapi
 * /api/solicitudes/{id}:
 *   delete:
 *     summary: Elimina una sol·licitud per ID
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sol·licitud a eliminar
 *     responses:
 *       204:
 *         description: Sol·licitud eliminada correctament
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeSolicitudParticipantOrAdmin,
  validate({ params: solicitudIdParamsSchema }),
  solicitudController.deleteSolicitud
);

/**
 * @openapi
 * /api/solicitudes/{id}/status:
 *   patch:
 *     summary: Canvia l'estat d'una sol·licitud
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sol·licitud a actualitzar
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
 *                 enum: [PENDING, ACCEPTED, REJECTED]
 *                 description: Nou estat de la sol·licitud
 *                 example: 'ACCEPTED'
 *     responses:
 *       200:
 *         description: Estat de la sol·licitud actualitzat correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Solicitud'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeSolicitudOwnerOrAdmin,
  validate({
    params: solicitudIdParamsSchema,
    body: updateSolicitudStatusSchema
  }),
  solicitudController.patchEstadoSolicitud
);

/**
 * @openapi
 * /api/solicitudes/{id}/guardar-cv:
 *   patch:
 *     summary: Guarda la clave S3 del CV tras la subida directa desde el cliente
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - cvKey
 *             properties:
 *               cvKey:
 *                 type: string
 *                 description: Clave del objeto en S3
 *     responses:
 *       200:
 *         description: Solicitud actualizada con la clave del CV
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id/guardar-cv',
  authenticateToken,
  validate({
    params: solicitudIdParamsSchema,
    body: guardarCvSchema
  }),
  solicitudController.guardarCvKey
);

/**
 * @openapi
 * /api/solicitudes/{id}/ver-cv:
 *   get:
 *     summary: Genera un enlace temporal (2 min) de lectura del CV en S3
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL de lectura generada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 viewUrl:
 *                   type: string
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/ver-cv',
  authenticateToken,
  authorizeSolicitudParticipantOrAdmin,
  validate({ params: solicitudIdParamsSchema }),
  solicitudController.verCv
);

/**
 * @openapi
 * /api/solicitudes/{id}/analizar-cv:
 *   post:
 *     summary: Inicia el análisis del CV adjunto a la solicitud mediante Inteligencia Artificial
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Solicitud analizada con éxito
 *       400:
 *         description: Parámetros inválidos o la solicitud no contiene un currículum adjunto
 *       403:
 *         description: No autorizado para analizar el currículum de esta solicitud
 *       404:
 *         description: Solicitud no encontrada
 *       429:
 *         description: Límite de solicitudes de la IA excedido
 *       503:
 *         description: El servicio de análisis de IA no está disponible
 */
router.post(
  '/:id/analizar-cv',
  authenticateToken,
  authorizeSolicitudOwnerOrAdmin,
  validate({ params: solicitudIdParamsSchema }),
  solicitudController.analizarCvConIa
);

export default router;
