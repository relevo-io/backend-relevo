import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as mentoringService from '../services/mentoringService.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { UnauthorizedError } from '../utils/AppError.js';

export const getModules = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const lang = req.headers['accept-language']?.split(',')[0].split('-')[0] || 'es';
  const modules = await mentoringService.listarModulosActivos(lang);
  res.status(200).json(modules);
});

export const getProgress = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    throw new UnauthorizedError('no autenticado');
  }
  const progress = await mentoringService.obtenerOInicializarProgreso(req.user.id);
  res.status(200).json(progress);
});

export const completeModule = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    throw new UnauthorizedError('no autenticado');
  }
  const { moduleId } = req.params;
  const progress = await mentoringService.completarModulo(req.user.id, moduleId);
  res.status(200).json(progress);
});

export const getMarkdownContent = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const { route, contentKey } = req.params;
  const lang = (req.query.lang as string) || req.headers['accept-language']?.split(',')[0].split('-')[0] || 'es';

  if (route !== 'BUY' && route !== 'SELL') {
    res.status(400).json({ error: 'Ruta no vàlida (ha de ser BUY o SELL)' });
    return;
  }

  const content = await mentoringService.obtenerContenidoMarkdown(route, contentKey, lang);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.status(200).send(content);
});
