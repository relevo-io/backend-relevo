import { Router } from 'express';
import * as solicitudController from '../controllers/solicitudController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import {
	createSolicitudSchema,
	solicitudIdParamsSchema,
	updateSolicitudSchema,
	updateSolicitudStatusSchema
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
 * /api/solicitudes/me:
 *   get:
 *     summary: Obté les sol·licituds rebudes pel propietari loguejat
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista de sol·licituds recuperada correctament
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/me', authenticateToken, authorizeRoles('OWNER', 'ADMIN'), solicitudController.getMisSolicitudes);

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
router.get('/:id', authenticateToken, authorizeSolicitudOwnerOrAdmin, validate({ params: solicitudIdParamsSchema }), solicitudController.getSolicitud);

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
router.post('/', authenticateToken, authorizeRoles('INTERESTED', 'ADMIN'), validate({ body: createSolicitudSchema }), solicitudController.createSolicitud);

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
router.delete('/:id', authenticateToken, authorizeSolicitudParticipantOrAdmin, validate({ params: solicitudIdParamsSchema }), solicitudController.deleteSolicitud);

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

export default router;

