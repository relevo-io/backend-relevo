import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { createCheckoutSessionSchema, paymentSessionIdParamsSchema } from '../validators/paymentValidator.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Pagos
 *   description: API per a la creació i consulta d'estat de sessions de pagament amb Stripe.
 *
 * components:
 *   schemas:
 *     PaymentSession:
 *       type: object
 *       required:
 *         - userId
 *         - kind
 *         - status
 *         - stripeCheckoutSessionId
 *         - amount
 *         - currency
 *       properties:
 *         _id:
 *           type: string
 *           description: ID únic de la sessió de pagament
 *           example: '65f2c3d4e5f6a7b8c9d0e1f2'
 *         userId:
 *           type: string
 *           description: ID de l'usuari que ha realitzat el pagament
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         kind:
 *           type: string
 *           enum: [offer_publication, pro_activation]
 *           description: Tipus de compra realitzada (publicació de nova oferta o activació de compte PRO)
 *           example: 'pro_activation'
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed, canceled]
 *           description: Estat del pagament
 *           example: 'completed'
 *         stripeCheckoutSessionId:
 *           type: string
 *           description: ID de la sessió de checkout a Stripe
 *           example: 'cs_test_a1b2c3d4...'
 *         amount:
 *           type: number
 *           description: Import pagat (en cèntims)
 *           example: 4900
 *         currency:
 *           type: string
 *           description: Moneda de la transacció
 *           example: 'eur'
 *         createdOfferId:
 *           type: string
 *           description: ID de la nova oferta creada en cas que el tipus sigui `offer_publication`
 *           example: '64f1a2b3c4d5e6f7a8b9c0d3'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/payments/checkout-session:
 *   post:
 *     summary: Crea una nova sessió de Checkout a Stripe per a realitzar un pagament (PRO o Publicació)
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kind
 *             properties:
 *               kind:
 *                 type: string
 *                 enum: [offer_publication, pro_activation]
 *                 description: Motiu del pagament
 *                 example: pro_activation
 *               offerDraft:
 *                 type: object
 *                 description: Dades de l'oferta a crear. Obligatori només si `kind` és `offer_publication`.
 *               returnUrlBase:
 *                 type: string
 *                 format: uri
 *                 description: URL base del client per a la redirecció d'èxit/cancel·lació (opcional)
 *                 example: 'http://localhost:3000/payments'
 *     responses:
 *       200:
 *         description: Sessió de checkout creada correctament, retorna la URL per a redirigir l'usuari
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                   description: ID de la sessió a Stripe
 *                   example: 'cs_test_a1b2c3d4...'
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: URL de Stripe per a completar el pagament
 *                   example: 'https://checkout.stripe.com/pay/cs_test...'
 *       400:
 *         description: Paràmetres invàlids o oferta faltant quan correspon
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/checkout-session',
  authenticateToken,
  validate({ body: createCheckoutSessionSchema }),
  paymentController.createCheckoutSession
);

/**
 * @openapi
 * /api/payments/checkout-session/{paymentSessionId}/status:
 *   get:
 *     summary: Obté l'estat d'una sessió de pagament específica pel seu ID intern
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentSessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sessió de pagament a la base de dades de Relevo (no el de Stripe)
 *     responses:
 *       200:
 *         description: Sessió trobada amb el seu estat actualitzat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSession'
 *       400:
 *         description: ID de sessió invàlid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Sessió de pagament no trobada
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/checkout-session/:paymentSessionId/status',
  authenticateToken,
  validate({ params: paymentSessionIdParamsSchema }),
  paymentController.getCheckoutSessionStatus
);

export default router;
