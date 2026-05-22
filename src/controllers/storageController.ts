import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { generarPresignedPut } from '../services/storageService.js';

/**
 * GET /api/storage/presigned-url
 * Genera una Pre-signed URL de tipo PUT para subir un archivo (CV) a S3.
 */
export const getPresignedUrl = asyncWrapper(async (req: AuthRequest, res: Response) => {
  // El validador ya asegura que req.query.filename sea un string válido
  const { filename } = req.query as { filename: string };

  const { uploadUrl, s3Key } = await generarPresignedPut(filename.trim());

  res.status(200).json({ uploadUrl, s3Key });
});
