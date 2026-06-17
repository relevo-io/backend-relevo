import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { presignedUrlQuerySchema, chatPresignedUrlQuerySchema } from '../validators/storageValidator.js';
import * as storageController from '../controllers/storageController.js';

const router = Router();

/**
 * @openapi
 * /api/storage/presigned-url:
 *   get:
 *     summary: Genera una Pre-signed URL de tipo PUT para subir un CV a S3
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del archivo a subir (ej. mi-cv.pdf)
 *     responses:
 *       200:
 *         description: URL firmada generada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uploadUrl:
 *                   type: string
 *                   description: URL de tipo PUT válida por 5 minutos
 *                 s3Key:
 *                   type: string
 *                   description: Clave del archivo en el bucket S3
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/presigned-url',
  authenticateToken,
  authorizeRoles('INTERESTED', 'ADMIN'),
  validate({ query: presignedUrlQuerySchema }),
  storageController.getPresignedUrl
);

/**
 * @openapi
 * /api/storage/chat-presigned-url:
 *   get:
 *     summary: Genera una Pre-signed URL de tipo PUT para subir un archivo del chat a S3
 *     tags: [Storage]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: mimeType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL firmada generada correctamente
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get(
  '/chat-presigned-url',
  authenticateToken,
  validate({ query: chatPresignedUrlQuerySchema }),
  storageController.getChatPresignedUrl
);

export default router;
