import { Router } from 'express';
import * as alertaController from '../controllers/alertaController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { alertaIdParamsSchema, createAlertaSchema } from '../validators/alertaValidator.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Alertas
 *   description: API per a la gestió d'alertes de cerca de noves oportunitats.
 *
 * components:
 *   schemas:
 *     AlertaMatchedOffer:
 *       type: object
 *       properties:
 *         offerId:
 *           type: string
 *           description: ID de l'oferta que ha fet match amb l'alerta
 *           example: '64f1a2b3c4d5e6f7a8b9c0d3'
 *         matchedAt:
 *           type: string
 *           format: date-time
 *           description: Data en què es va detectar el match
 *
 *     Alerta:
 *       type: object
 *       required:
 *         - userId
 *         - isActive
 *       properties:
 *         _id:
 *           type: string
 *           description: ID únic de l'alerta en format ObjectId
 *           example: '65f2c3d4e5f6a7b8c9d0e1f2'
 *         userId:
 *           type: string
 *           description: ID de l'usuari creador de l'alerta
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         name:
 *           type: string
 *           description: Nom descriptiu de l'alerta
 *           example: 'Tecnològiques a Barcelona'
 *         revenueRange:
 *           type: string
 *           description: Rang de facturació objectiu
 *           example: '100k-500k'
 *         employeeRange:
 *           type: string
 *           description: Rang de treballadors objectiu
 *           example: '1-9'
 *         region:
 *           type: string
 *           description: Regió geogràfica objectiu
 *           example: 'Catalunya'
 *         isActive:
 *           type: boolean
 *           description: Estat actiu/inactiu de l'alerta
 *           example: true
 *         matchedOffers:
 *           type: array
 *           description: Llista d'ofertes que han matxat amb aquesta alerta
 *           items:
 *             $ref: '#/components/schemas/AlertaMatchedOffer'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @openapi
 * /api/alertas:
 *   post:
 *     summary: Crea una nova alerta per a l'usuari autenticat
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nom personalitzat per a l'alerta
 *                 maxLength: 80
 *                 example: 'Oportunitats a Barcelona'
 *               revenueRange:
 *                 type: string
 *                 description: Rang de facturació anual
 *                 example: '100k-500k'
 *               employeeRange:
 *                 type: string
 *                 description: Rang de nombre de treballadors
 *                 example: '1-9'
 *               region:
 *                 type: string
 *                 description: Regió de les empreses
 *                 maxLength: 120
 *                 example: 'Catalunya'
 *     responses:
 *       201:
 *         description: Alerta creada correctament
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alerta'
 *       400:
 *         description: Paràmetres invàlids o falta algun criteri de cerca obligatori
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticateToken, validate({ body: createAlertaSchema }), alertaController.createAlert);

/**
 * @openapi
 * /api/alertas:
 *   get:
 *     summary: Llista totes les alertes actives de l'usuari autenticat
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Llista d'alertes de l'usuari
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Alerta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', authenticateToken, alertaController.getAlerts);

/**
 * @openapi
 * /api/alertas/{alertaId}:
 *   delete:
 *     summary: Elimina una alerta específica de l'usuari autenticat per ID
 *     tags: [Alertas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertaId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB de l'alerta a eliminar
 *     responses:
 *       200:
 *         description: Alerta eliminada correctament
 *       400:
 *         description: ID d'alerta invàlid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Alerta no trobada o no pertany a l'usuari actual
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:alertaId',
  authenticateToken,
  validate({ params: alertaIdParamsSchema }),
  alertaController.deleteAlert
);

export default router;
