import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { generarPresignedPut } from '../services/storageService.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { ValidationError } from '../utils/AppError.js';
import { AuthRequest } from '../middlewares/auth.js';
import { Response } from 'express';

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
  asyncWrapper(async (req: AuthRequest, res: Response) => {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string' || !filename.trim()) {
      throw new ValidationError('El parámetro "filename" es requerido');
    }

    const { uploadUrl, s3Key } = await generarPresignedPut(filename.trim());

    res.status(200).json({ uploadUrl, s3Key });
  })
);

export default router;
