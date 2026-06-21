import { Router } from 'express';
import * as usuarioController from '../controllers/usuarioController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import {
  createUsuarioPublicSchema,
  deleteManyUsuariosSchema,
  updateMarketplacePreferencesSchema,
  updateManyUsuariosVisibilitySchema,
  usuarioIdParamsSchema,
  updateUsuarioVisibilitySchema,
  fcmTokenSchema,
  updateNotificationPreferencesSchema
} from '../validators/usuarioValidator.js';
import { authenticateToken, authorizeRoles, authorizeSelfOrAdmin } from '../middlewares/auth.js';
import { validateUsuarioUpdateBody } from '../middlewares/usuarioMiddlewares.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Usuarios
 *   description: API para la gestión de usuarios registrados en el sistema.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateUsuario:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *         - role
 *       properties:
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 120
 *           example: 'Juan Perez'
 *         email:
 *           type: string
 *           format: email
 *           example: 'juan@relevo.io'
 *         password:
 *           type: string
 *           minLength: 6
 *           format: password
 *           example: 'secret123'
 *         role:
 *           type: string
 *           enum: [OWNER, INTERESTED, ADMIN]
 *           example: 'INTERESTED'
 *         location:
 *           type: string
 *           maxLength: 120
 *         bio:
 *           type: string
 *           maxLength: 500
 *         professionalBackground:
 *           type: string
 *           maxLength: 2000
 *         preferredRegions:
 *           type: array
 *           items:
 *             type: string
 *         visible:
 *           type: boolean
 *           default: true
 *         language:
 *           type: string
 *           enum: [es, ca, en]
 *           default: es
 *
 *     UpdateUsuario:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 120
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *           format: password
 *         role:
 *           type: string
 *           enum: [OWNER, INTERESTED, ADMIN]
 *         location:
 *           type: string
 *           maxLength: 120
 *         bio:
 *           type: string
 *           maxLength: 500
 *         professionalBackground:
 *           type: string
 *           maxLength: 2000
 *         preferredRegions:
 *           type: array
 *           items:
 *             type: string
 *         visible:
 *           type: boolean
 *         language:
 *           type: string
 *           enum: [es, ca, en]
 */

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     summary: Obtiene la lista completa de usuarios (solo ADMIN)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios recuperada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticateToken, authorizeRoles('ADMIN'), usuarioController.getUsuarios);

/**
 * @openapi
 * /api/usuarios/fcm-token:
 *   post:
 *     summary: Registra un nou token de Firebase Cloud Messaging (FCM) per a l'usuari actual
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 minLength: 10
 *                 description: Token FCM generat pel dispositiu client
 *                 example: 'fcm_token_xyz_1234567890...'
 *     responses:
 *       200:
 *         description: Token registrat correctament
 *       400:
 *         description: Paràmetres invàlids o token massa curt
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/fcm-token', authenticateToken, validate({ body: fcmTokenSchema }), usuarioController.registerFcmToken);

/**
 * @openapi
 * /api/usuarios/fcm-token/{token}:
 *   delete:
 *     summary: Elimina/desregistra un token FCM de l'usuari actual
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: El token FCM a eliminar
 *     responses:
 *       200:
 *         description: Token eliminat correctament
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/fcm-token/:token', authenticateToken, usuarioController.unregisterFcmToken);

/**
 * @openapi
 * /api/usuarios/me/notification-preferences:
 *   patch:
 *     summary: Actualitza les preferències de notificació push de l'usuari actual
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newMessages
 *               - applicationStatus
 *               - newApplications
 *               - cvAnalysis
 *               - offerAlerts
 *             properties:
 *               newMessages:
 *                 type: boolean
 *                 description: Notificacions de nous missatges al xat
 *                 example: true
 *               applicationStatus:
 *                 type: boolean
 *                 description: Notificacions quan canvia l'estat d'una sol·licitud
 *                 example: true
 *               newApplications:
 *                 type: boolean
 *                 description: Notificacions de noves sol·licituds rebudes a les meves ofertes
 *                 example: true
 *               cvAnalysis:
 *                 type: boolean
 *                 description: Notificacions quan finalitza l'anàlisi de CV
 *                 example: true
 *               offerAlerts:
 *                 type: boolean
 *                 description: Notificacions per match de noves alertes de cerca
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferències de notificació actualitzades correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Paràmetres incorrectes o camps de preferències invàlids
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/me/notification-preferences',
  authenticateToken,
  validate({ body: updateNotificationPreferencesSchema }),
  usuarioController.updateNotificationPreferences
);

/**
 * @openapi
 * /api/usuarios/me/marketplace-preferences:
 *   patch:
 *     summary: Actualitza les preferències de filtre del mercat (marketplace) de l'usuari actual
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferredRegions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['Catalunya', 'Madrid']
 *               preferredSectors:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['TECHNOLOGY', 'SERVICES']
 *               preferredEmployeeRanges:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [1_5, 6_10, 11_25, 26_50, 51_100, 100_PLUS]
 *                 example: ['11_25', '26_50']
 *               preferredRevenueRanges:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [UNDER_100K, BETWEEN_100K_500K, BETWEEN_500K_1M, BETWEEN_1M_5M, OVER_5M]
 *                 example: ['BETWEEN_100K_500K']
 *               preferredCreationYearFrom:
 *                 type: integer
 *                 minimum: 1800
 *                 example: 2010
 *               preferredCreationYearTo:
 *                 type: integer
 *                 minimum: 1800
 *                 example: 2024
 *     responses:
 *       200:
 *         description: Preferències de marketplace actualitzades correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Paràmetres invàlids (per exemple, any d'inici superior a l'any de fi)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/me/marketplace-preferences',
  authenticateToken,
  authorizeRoles('INTERESTED', 'ADMIN'),
  validate({ body: updateMarketplacePreferencesSchema }),
  usuarioController.updateMarketplacePreferences
);

/**
 * @openapi
 * /api/usuarios/me/pro/activate:
 *   post:
 *     summary: Activa el pla PRO per a l'usuari actual (de forma directa / simulació o processament manual)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pla PRO activat correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/me/pro/activate',
  authenticateToken,
  authorizeRoles('INTERESTED', 'ADMIN'),
  usuarioController.activateProPlan
);

/**
 * @openapi
 * /api/usuarios/me/ratings:
 *   get:
 *     summary: Obté totes les valoracions rebudes per l'usuari actual en les seves vendes o compres
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista de valoracions obtinguda correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Rating'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/me/ratings', authenticateToken, usuarioController.getMyRatings);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtiene un usuario específico por su ID (self o ADMIN)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB del usuario
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeSelfOrAdmin('id'),
  validate({ params: usuarioIdParamsSchema }),
  usuarioController.getUsuario
);

/**
 * @openapi
 * /api/usuarios:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUsuario'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', validate({ body: createUsuarioPublicSchema }), usuarioController.createUsuario);

/**
 * @openapi
 * /api/usuarios/batch:
 *   delete:
 *     summary: Elimina múltiples usuarios por una lista de IDs (solo ADMIN)
 *     tags: [Usuarios]
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
 *                 example:
 *                   - 64f1a2b3c4d5e6f7a8b9c0d1
 *                   - 64f1a2b3c4d5e6f7a8b9c0d2
 *     responses:
 *       200:
 *         description: Borrado múltiple ejecutado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 requestedCount:
 *                   type: number
 *                 deletedCount:
 *                   type: number
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/batch',
  authenticateToken,
  authorizeRoles('ADMIN'),
  validate({ body: deleteManyUsuariosSchema }),
  usuarioController.deleteManyUsuarios
);

/**
 * @openapi
 * /api/usuarios/batch/visibility:
 *   patch:
 *     summary: Cambia la visibilidad de múltiples usuarios (solo ADMIN)
 *     tags: [Usuarios]
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
 *               - visible
 *             properties:
 *               ids:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: string
 *                 example:
 *                   - 64f1a2b3c4d5e6f7a8b9c0d1
 *                   - 64f1a2b3c4d5e6f7a8b9c0d2
 *               visible:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Visibilidad actualizada para múltiples usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 requestedCount:
 *                   type: number
 *                 matchedCount:
 *                   type: number
 *                 modifiedCount:
 *                   type: number
 *                 visible:
 *                   type: boolean
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/batch/visibility',
  authenticateToken,
  authorizeRoles('ADMIN'),
  validate({ body: updateManyUsuariosVisibilitySchema }),
  usuarioController.patchManyUsuariosVisibility
);

/**
 * @openapi
 * /api/usuarios/{id}/visibility:
 *   patch:
 *     summary: Cambia la visibilidad de un usuario (self o ADMIN)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - visible
 *             properties:
 *               visible:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  '/:id/visibility',
  authenticateToken,
  authorizeSelfOrAdmin('id'),
  validate({
    params: usuarioIdParamsSchema,
    body: updateUsuarioVisibilitySchema
  }),
  usuarioController.patchUsuarioVisibility
);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualiza los datos de un usuario por su ID (self o ADMIN)
 *     tags: [Usuarios]
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
 *             $ref: '#/components/schemas/UpdateUsuario'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
/**
 * @openapi
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Elimina un usuario por su ID (self o ADMIN)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Usuario eliminado exitosamente
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeSelfOrAdmin('id'),
  validateUsuarioUpdateBody,
  validate({
    params: usuarioIdParamsSchema
  }),
  usuarioController.updateUsuario
);

router.patch(
  '/:id',
  authenticateToken,
  authorizeSelfOrAdmin('id'),
  validateUsuarioUpdateBody,
  validate({
    params: usuarioIdParamsSchema
  }),
  usuarioController.updateUsuario
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeSelfOrAdmin('id'),
  validate({ params: usuarioIdParamsSchema }),
  usuarioController.deleteUsuario
);

export default router;
