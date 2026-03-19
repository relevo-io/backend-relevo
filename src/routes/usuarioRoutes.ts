import { Router } from 'express';
import * as usuarioController from '../controllers/usuarioController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import {
	createUsuarioSchema,
	deleteManyUsuariosSchema,
	updateUsuarioSchema,
	updateManyUsuariosVisibilitySchema,
	usuarioIdParamsSchema,
	updateUsuarioVisibilitySchema
} from '../validators/usuarioValidator.js';

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
 *           enum: [OWNER, INTERESTED]
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
 *           enum: [OWNER, INTERESTED]
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
 */

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     summary: Obtiene la lista completa de usuarios
 *     tags: [Usuarios]
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
router.get('/', usuarioController.getUsuarios);

/**
 * @openapi
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtiene un usuario específico por su ID
 *     tags: [Usuarios]
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', validate({ params: usuarioIdParamsSchema }), usuarioController.getUsuario);

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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', validate({ body: createUsuarioSchema }), usuarioController.createUsuario);

/**
 * @openapi
 * /api/usuarios/batch:
 *   delete:
 *     summary: Elimina múltiples usuarios por una lista de IDs
 *     tags: [Usuarios]
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
router.delete('/batch', validate({ body: deleteManyUsuariosSchema }), usuarioController.deleteManyUsuarios);

/**
 * @openapi
 * /api/usuarios/batch/visibility:
 *   patch:
 *     summary: Cambia la visibilidad de múltiples usuarios
 *     tags: [Usuarios]
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
	validate({ body: updateManyUsuariosVisibilitySchema }),
	usuarioController.patchManyUsuariosVisibility
);

/**
 * @openapi
 * /api/usuarios/{id}/visibility:
 *   patch:
 *     summary: Cambia la visibilidad de un usuario
 *     tags: [Usuarios]
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
 *     summary: Actualiza los datos de un usuario por su ID
 *     tags: [Usuarios]
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
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * @openapi
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Elimina un usuario por su ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Usuario eliminado exitosamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put(
	'/:id',
	validate({
		params: usuarioIdParamsSchema,
		body: updateUsuarioSchema
	}),
	usuarioController.updateUsuario
);

router.delete('/:id', validate({ params: usuarioIdParamsSchema }), usuarioController.deleteUsuario);

export default router;
