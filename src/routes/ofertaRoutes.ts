import { Router } from 'express';
import * as ofertaController from '../controllers/ofertaController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import {
	createOfertaSchema,
	ofertaIdParamsSchema,
	updateOfertaSchema
} from '../validators/ofertaValidator.js';
import { authenticateToken, authorizeOfertaOwnerOrAdmin, authorizeRoles } from '../middlewares/auth.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Ofertas
 *   description: API per a la gestió d'ofertes d'empresa publicades a la plataforma.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     CreateOferta:
 *       type: object
 *       required:
 *         - region
 *         - sector
 *         - owner
 *         - companyDescription
 *       properties:
 *         region:
 *           type: string
 *           example: 'Catalunya'
 *         sector:
 *           type: string
 *           example: 'Tecnologia'
 *         revenueRange:
 *           type: string
 *           enum: [UNDER_100K, BETWEEN_100K_500K, BETWEEN_500K_1M, BETWEEN_1M_5M, OVER_5M]
 *         owner:
 *           type: string
 *           description: ID de l'usuari propietari (referencia a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         creationYear:
 *           type: number
 *           minimum: 1800
 *           example: 2015
 *         employeeRange:
 *           type: string
 *           enum: [1_5, 6_10, 11_25, 26_50, 51_100, 100_PLUS]
 *         companyDescription:
 *           type: string
 *           maxLength: 3000
 *
 *     UpdateOferta:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         region:
 *           type: string
 *         sector:
 *           type: string
 *         revenueRange:
 *           type: string
 *           enum: [UNDER_100K, BETWEEN_100K_500K, BETWEEN_500K_1M, BETWEEN_1M_5M, OVER_5M]
 *         owner:
 *           type: string
 *           description: ID de l'usuari propietari (referencia a Usuario)
 *         creationYear:
 *           type: number
 *           minimum: 1800
 *           example: 2015
 *         employeeRange:
 *           type: string
 *           enum: [1_5, 6_10, 11_25, 26_50, 51_100, 100_PLUS]
 *         companyDescription:
 *           type: string
 *           maxLength: 3000
 */

/**
 * @openapi
 * /api/ofertas:
 *   get:
 *     summary: Obté la llista completa d'ofertes
 *     tags: [Ofertas]
 *     responses:
 *       200:
 *         description: Llista d'ofertes recuperada correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Oferta'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', ofertaController.getOfertas);

/**
 * @openapi
 * /api/ofertas/{id}:
 *   get:
 *     summary: Obté una oferta específica per ID
 *     tags: [Ofertas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB de l'oferta
 *     responses:
 *       200:
 *         description: Oferta trobada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Oferta'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', validate({ params: ofertaIdParamsSchema }), ofertaController.getOferta);

/**
 * @openapi
 * /api/ofertas:
 *   post:
 *     summary: Crea una nova oferta
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOferta'
 *           example:
 *             region: Catalunya
 *             sector: Tecnologia
 *             revenueRange: BETWEEN_100K_500K
 *             owner: 64f1a2b3c4d5e6f7a8b9c0d1
 *             creationYear: 2019
 *             employeeRange: 11_25
 *             companyDescription: Empresa de tecnologia sostenible fundada el 2019.
 *     responses:
 *       201:
 *         description: Oferta creada correctament
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticateToken, authorizeRoles('OWNER', 'ADMIN'), validate({ body: createOfertaSchema }), ofertaController.createOferta);

/**
 * @openapi
 * /api/ofertas/{id}:
 *   put:
 *     summary: Actualitza una oferta per ID
 *     tags: [Ofertas]
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
 *             $ref: '#/components/schemas/UpdateOferta'
 *           example:
 *             sector: Tecnologia
 *             employeeRange: 26_50
 *             companyDescription: Actualizacion de la descripcion de la empresa.
 *     responses:
 *       200:
 *         description: Oferta actualitzada correctament
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.put(
	'/:id',
	authenticateToken,
	authorizeOfertaOwnerOrAdmin,
	validate({
		params: ofertaIdParamsSchema,
		body: updateOfertaSchema
	}),
	ofertaController.updateOferta
);

/**
 * @openapi
 * /api/ofertas/{id}:
 *   delete:
 *     summary: Elimina una oferta per ID
 *     tags: [Ofertas]
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
 *         description: Oferta eliminada correctament
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:id', authenticateToken, authorizeOfertaOwnerOrAdmin, validate({ params: ofertaIdParamsSchema }), ofertaController.deleteOferta);

export default router;
