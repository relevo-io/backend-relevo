import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { presignedUrlQuerySchema } from '../validators/storageValidator.js';
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

export default router;
