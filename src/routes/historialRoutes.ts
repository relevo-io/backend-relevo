import { Router } from 'express';
import { getHistorials, getHistorialById, deleteHistorial } from '../controllers/historialController.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Historials
 *   description: API per a la gestió de l'auditoria de canvis de les entitats (Historial).
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Canvi:
 *       type: object
 *       required:
 *         - campo
 *       properties:
 *         campo:
 *           type: string
 *           description: Nom del camp que s'ha modificat
 *           example: 'sector'
 *         valorAnterior:
 *           type: string
 *           description: Valor que tenia abans de la modificació
 *           example: 'Tecnologia'
 *         valorNuevo:
 *           type: string
 *           description: Nou valor assignat
 *           example: 'Tecnologia Sostenible'
 *     Historial:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID únic del registre
 *           example: '65f2b3c4d5e6f7a8b9c0e2a5'
 *         ofertaId:
 *           type: string
 *           description: ID de l'oferta que s'ha modificat
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         fecha:
 *           type: string
 *           format: date-time
 *           description: Data de la modificació
 *         canvis:
 *           type: array
 *           description: Llista de camps canviats
 *           items:
 *             $ref: '#/components/schemas/Canvi'
 */

/**
 * @openapi
 * /api/historials:
 *   get:
 *     summary: Obté la llista de tots els historials amb paginació i cerca
 *     tags: [Historials]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           description: Número de pàgina
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           description: Nombre d'elements per pàgina
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           description: Criteri de cerca
 *     responses:
 *       200:
 *         description: Llista d'historials recuperada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                data:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/Historial'
 *       500:
 *         description: Error intern del servidor
 */
router.get('/', getHistorials);

/**
 * @openapi
 * /api/historials/{id}:
 *   get:
 *     summary: Obté un historial específic per ID
 *     tags: [Historials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB de l'historial
 *     responses:
 *       200:
 *         description: Historial trobat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Historial'
 *       404:
 *         description: Historial no trobat
 *       500:
 *         description: Error intern del servidor
 */
router.get('/:id', getHistorialById);

/**
 * @openapi
 * /api/historials/{id}:
 *   delete:
 *     summary: Elimina un registre d'historial per ID
 *     tags: [Historials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB de l'historial a esborrar
 *     responses:
 *       200:
 *         description: Historial eliminat correctament
 *       404:
 *         description: Historial no trobat
 *       500:
 *         description: Error intern del servidor
 */
router.delete('/:id', deleteHistorial);

export default router;
