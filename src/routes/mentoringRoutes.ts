import { Router } from 'express';
import * as mentoringController from '../controllers/mentoringController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Mentoring
 *   description: API per a la gestió del mòdul d'aprenentatge i mentoring (compra/venda d'empreses).
 *
 * components:
 *   schemas:
 *     MentoringItem:
 *       type: object
 *       required:
 *         - type
 *         - titleKey
 *         - contentKey
 *       properties:
 *         type:
 *           type: string
 *           enum: [tip, question, task]
 *           description: Tipus d'element del pas de mentoring
 *           example: tip
 *         titleKey:
 *           type: string
 *           description: Clau de traducció per al títol
 *           example: mentoring.buy.module1.step1.title
 *         contentKey:
 *           type: string
 *           description: Clau per a identificar el contingut markdown associat
 *           example: step1_how_to_buy
 *         optionsKeys:
 *           type: array
 *           items:
 *             type: string
 *           description: Claus de traducció per a les opcions (només per a preguntes)
 *           example: []
 *
 *     MentoringModule:
 *       type: object
 *       required:
 *         - route
 *         - titleKey
 *         - descriptionKey
 *         - items
 *         - order
 *         - duration
 *         - isActive
 *       properties:
 *         _id:
 *           type: string
 *           description: ID únic del mòdul de mentoring
 *           example: '65f2b3c4d5e6f7a8b9c0e2a5'
 *         route:
 *           type: string
 *           enum: [BUY, SELL]
 *           description: Ruta a la qual pertany el mòdul (Compra o Venda)
 *           example: BUY
 *         titleKey:
 *           type: string
 *           description: Clau de traducció per al títol del mòdul
 *           example: mentoring.buy.module1.title
 *         descriptionKey:
 *           type: string
 *           description: Clau de traducció per a la descripció del mòdul
 *           example: mentoring.buy.module1.description
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MentoringItem'
 *         order:
 *           type: integer
 *           description: Ordre de visualització del mòdul
 *           example: 1
 *         duration:
 *           type: integer
 *           description: Durada estimada en minuts
 *           example: 15
 *         isActive:
 *           type: boolean
 *           description: Indica si el mòdul està actiu o no
 *           example: true
 *
 *     MentoringProgress:
 *       type: object
 *       required:
 *         - userId
 *         - completedModules
 *         - completedSteps
 *         - progressPercentage
 *       properties:
 *         _id:
 *           type: string
 *           description: ID únic del registre de progrés
 *           example: '65f2c3d4e5f6a7b8c9d0e1f2'
 *         userId:
 *           type: string
 *           description: ID de l'usuari associat a aquest progrés
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         completedModules:
 *           type: array
 *           description: Llista d'IDs de mòduls completats completament
 *           items:
 *             type: string
 *           example: ['65f2b3c4d5e6f7a8b9c0e2a5']
 *         completedSteps:
 *           type: array
 *           description: Llista de contentKey de passos completats de forma individual
 *           items:
 *             type: string
 *           example: ['step1_how_to_buy', 'step2_market_analysis']
 *         progressPercentage:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentatge global de progrés de l'usuari
 *           example: 45
 */

/**
 * @openapi
 * /api/mentoring/modules:
 *   get:
 *     summary: Obté tots els mòduls de mentoring actius filtrats per l'idioma sol·licitat (en les claus)
 *     tags: [Mentoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: accept-language
 *         required: false
 *         schema:
 *           type: string
 *         description: Idioma preferit del client (ca, es, en)
 *     responses:
 *       200:
 *         description: Llista de mòduls recuperada correctament
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MentoringModule'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/modules', authenticateToken, mentoringController.getModules);

/**
 * @openapi
 * /api/mentoring/progress:
 *   get:
 *     summary: Obté o inicialitza el progrés de mentoring de l'usuari autenticat
 *     tags: [Mentoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progrés de mentoring actual de l'usuari
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MentoringProgress'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/progress', authenticateToken, mentoringController.getProgress);

/**
 * @openapi
 * /api/mentoring/progress/complete/{moduleId}:
 *   post:
 *     summary: Marca un mòdul de mentoring complet de forma manual (i autocompleta tots els seus passos)
 *     tags: [Mentoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de MongoDB del mòdul de mentoring a completar
 *     responses:
 *       200:
 *         description: Mòdul completat correctament i progrés actualitzat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MentoringProgress'
 *       400:
 *         description: El mòdul no existeix o no està actiu
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/progress/complete/:moduleId', authenticateToken, mentoringController.completeModule);

/**
 * @openapi
 * /api/mentoring/progress/toggle-step:
 *   post:
 *     summary: Alterna (marca/desmarca) un pas (step) de mentoring com a completat
 *     tags: [Mentoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contentKey
 *             properties:
 *               contentKey:
 *                 type: string
 *                 description: Clau única de l'element/pas a alternar
 *                 example: 'step1_how_to_buy'
 *     responses:
 *       200:
 *         description: Pas alternat correctament i progrés recalculat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MentoringProgress'
 *       400:
 *         description: Falta contentKey en el body
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/progress/toggle-step', authenticateToken, mentoringController.toggleStep);

/**
 * @openapi
 * /api/mentoring/content/{route}/{contentKey}:
 *   get:
 *     summary: Obté el contingut d'aprenentatge en format Markdown d'un pas específic
 *     tags: [Mentoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: route
 *         required: true
 *         schema:
 *           type: string
 *           enum: [BUY, SELL]
 *         description: Ruta del mentoring (BUY o SELL)
 *       - in: path
 *         name: contentKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Clau identificadora del contingut del pas
 *       - in: query
 *         name: lang
 *         required: false
 *         schema:
 *           type: string
 *         description: Idioma del contingut (opcional, si es passa té prioritat sobre accept-language)
 *     responses:
 *       200:
 *         description: Contingut Markdown obtingut correctament
 *         content:
 *           text/markdown:
 *             schema:
 *               type: string
 *       400:
 *         description: Ruta no vàlida (no és BUY o SELL) o format incorrecte
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/content/:route/:contentKey', authenticateToken, mentoringController.getMarkdownContent);

export default router;
