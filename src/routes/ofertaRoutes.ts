import { Router } from 'express';
import * as ofertaController from '../controllers/ofertaController.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import {
  createOfertaSchema,
  ofertaIdParamsSchema,
  ofertaQuerySchema,
  updateOfertaSchema
} from '../validators/ofertaValidator.js';
import {
  authenticateToken,
  authorizeOfertaOwnerOrAdmin,
  authorizeRoles,
  optionalAuthenticateToken
} from '../middlewares/auth.js';

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
 *         - companyDescription
 *       properties:
 *         region:
 *           type: string
 *           example: 'Catalunya'
 *         sector:
 *           type: string
 *           enum: [TECHNOLOGY, HOSPITALITY, SERVICES, INDUSTRIAL, RETAIL, HEALTHCARE, LOGISTICS, EDUCATION]
 *           example: 'TECHNOLOGY'
 *         revenueRange:
 *           type: string
 *           enum: [UNDER_100K, BETWEEN_100K_500K, BETWEEN_500K_1M, BETWEEN_1M_5M, OVER_5M]
 *           example: 'BETWEEN_100K_500K'
 *         owner:
 *           type: string
 *           description: ID de l'usuari propietari (opcional, per defecte és l'usuari autenticat)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         creationYear:
 *           type: number
 *           minimum: 1800
 *           example: 2015
 *         employeeRange:
 *           type: string
 *           enum: ['1_5', '6_10', '11_25', '26_50', '51_100', '100_PLUS']
 *           example: '11_25'
 *         companyDescription:
 *           type: string
 *           maxLength: 3000
 *           example: 'Empresa de tecnologia sostenible fundada el 2019.'
 *         extendedDescription:
 *           type: string
 *           maxLength: 10000
 *           example: 'Descripció ampliada per a inversors.'
 *
 *     UpdateOferta:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         region:
 *           type: string
 *           example: 'Catalunya'
 *         sector:
 *           type: string
 *           enum: [TECHNOLOGY, HOSPITALITY, SERVICES, INDUSTRIAL, RETAIL, HEALTHCARE, LOGISTICS, EDUCATION]
 *           example: 'TECHNOLOGY'
 *         revenueRange:
 *           type: string
 *           enum: [UNDER_100K, BETWEEN_100K_500K, BETWEEN_500K_1M, BETWEEN_1M_5M, OVER_5M]
 *           example: 'BETWEEN_100K_500K'
 *         owner:
 *           type: string
 *           description: ID de l'usuari propietari
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         creationYear:
 *           type: number
 *           minimum: 1800
 *           example: 2015
 *         employeeRange:
 *           type: string
 *           enum: ['1_5', '6_10', '11_25', '26_50', '51_100', '100_PLUS']
 *           example: '11_25'
 *         companyDescription:
 *           type: string
 *           maxLength: 3000
 *           example: 'Empresa de tecnologia sostenible fundada el 2019.'
 *         extendedDescription:
 *           type: string
 *           maxLength: 10000
 *           example: 'Descripció ampliada per a inversors.'
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
router.get('/', optionalAuthenticateToken, validate({ query: ofertaQuerySchema }), ofertaController.getOfertas);

/**
 * @openapi
 * /api/ofertas/me:
 *   get:
 *     summary: Obté les ofertes del propietari actual
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista d'ofertes pròpies recuperada correctament
 */
router.get('/me', authenticateToken, authorizeRoles('OWNER', 'ADMIN'), ofertaController.getMisOfertas);
/**
 * @openapi
 * /api/ofertas/me/analytics-summary:
 *   get:
 *     summary: Obté el resum analític global de totes les ofertes de l'usuari (visites, favorits, etc.)
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resum analític obtingut
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOffers:
 *                   type: integer
 *                   example: 3
 *                 totalViews:
 *                   type: integer
 *                   example: 154
 *                 totalFavorites:
 *                   type: integer
 *                   example: 12
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/me/analytics-summary',
  authenticateToken,
  authorizeRoles('OWNER', 'ADMIN'),
  ofertaController.getMisOfertasAnalyticsSummary
);

/**
 * @openapi
 * /api/ofertas/favorites:
 *   get:
 *     summary: Llista totes les ofertes marcades com a preferides per l'usuari actual
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista de favorits recuperada correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Oferta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/favorites', authenticateToken, ofertaController.getMisFavoritas);

/**
 * @openapi
 * /api/ofertas/publication-credit/purchase:
 *   post:
 *     summary: Inicia la compra d'un crèdit de publicació per a una nova oferta (Stripe Checkout)
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sessió de checkout creada, retorna URL de redirecció a Stripe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   example: 'https://checkout.stripe.com/pay/cs_test...'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/publication-credit/purchase',
  authenticateToken,
  authorizeRoles('OWNER', 'ADMIN'),
  ofertaController.purchasePublicationCredit
);

/**
 * @openapi
 * /api/ofertas/{id}/favorite:
 *   post:
 *     summary: Afegeix una oferta a la llista de preferides de l'usuari actual
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'oferta a marcar com a preferida
 *     responses:
 *       200:
 *         description: Oferta afegida als preferits correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Oferta afegida als preferits'
 *       400:
 *         description: ID d'oferta invàlid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:id/favorite',
  authenticateToken,
  validate({ params: ofertaIdParamsSchema }),
  ofertaController.addOfertaFavorita
);

/**
 * @openapi
 * /api/ofertas/{id}/favorite:
 *   delete:
 *     summary: Elimina una oferta de la llista de preferides de l'usuari actual
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'oferta a desmarcar com a preferida
 *     responses:
 *       200:
 *         description: Oferta eliminada dels preferits correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Oferta eliminada dels preferits'
 *       400:
 *         description: ID d'oferta invàlid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:id/favorite',
  authenticateToken,
  validate({ params: ofertaIdParamsSchema }),
  ofertaController.removeOfertaFavorita
);

/**
 * @openapi
 * /api/ofertas/{id}/view:
 *   post:
 *     summary: Registra una visualització d'una oferta per part d'un usuari (anònim o registrat)
 *     tags: [Ofertas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'oferta a visualitzar
 *     responses:
 *       200:
 *         description: Visualització registrada correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: ID d'oferta invàlid
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:id/view',
  optionalAuthenticateToken,
  validate({ params: ofertaIdParamsSchema }),
  ofertaController.registerOfertaView
);

/**
 * @openapi
 * /api/ofertas/{id}/analytics:
 *   get:
 *     summary: Obté les dades analítiques detallades d'una oferta específica (visualitzacions acumulades, etc.)
 *     tags: [Ofertas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'oferta de la qual es volen les analítiques
 *     responses:
 *       200:
 *         description: Dades analítiques recuperades
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 views:
 *                   type: integer
 *                   example: 45
 *                 favorites:
 *                   type: integer
 *                   example: 3
 *                 chatsCount:
 *                   type: integer
 *                   example: 2
 *       400:
 *         description: ID d'oferta invàlid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id/analytics',
  authenticateToken,
  authorizeRoles('OWNER', 'ADMIN'),
  validate({ params: ofertaIdParamsSchema }),
  ofertaController.getOfertaAnalytics
);

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
 *             extendedDescription: Descripcion ampliada para analisis de inversores.
 *     responses:
 *       201:
 *         description: Oferta creada correctament
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('OWNER', 'ADMIN'),
  validate({ body: createOfertaSchema }),
  ofertaController.createOferta
);

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
 *             extendedDescription: Actualizacion de descripcion extendida.
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
router.delete(
  '/:id',
  authenticateToken,
  authorizeOfertaOwnerOrAdmin,
  validate({ params: ofertaIdParamsSchema }),
  ofertaController.deleteOferta
);

export default router;
