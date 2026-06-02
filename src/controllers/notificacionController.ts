import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as notificacionService from '../services/notificacionService.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { UnauthorizedError } from '../utils/AppError.js';

export const getNotifications = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    throw new UnauthorizedError('no autenticado');
  }
  const notifications = await notificacionService.obtenerNotificacionesPorUsuario(req.user.id);
  res.status(200).json(notifications);
});

export const markAsRead = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    throw new UnauthorizedError('no autenticado');
  }
  const { notificacionId } = req.params;
  const updated = await notificacionService.marcarComoLeida(req.user.id, notificacionId);
  res.status(200).json(updated);
});
