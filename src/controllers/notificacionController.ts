import { Response } from 'express';
import { NotificacionModel } from '../models/notificacionModel.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError } from '../utils/AppError.js';
import { AuthRequest } from '../middlewares/auth.js';
import { PaginationMeta } from '../models/pagination.js';

export const getNotificaciones = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado');
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 15;
  const skip = (page - 1) * limit;

  const totalItems = await NotificacionModel.countDocuments({ userId });
  const unreadCount = await NotificacionModel.countDocuments({ userId, read: false });
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const items = await NotificacionModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

  const pagination: PaginationMeta = {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };

  res.status(200).json({
    items,
    pagination,
    unreadCount
  });
});

export const markAsRead = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado');
  }

  const notification = await NotificacionModel.findOneAndUpdate(
    { _id: id, userId },
    { $set: { read: true } },
    { new: true } // Utiliza mongoose original o returnDocument
  );

  if (!notification) {
    throw new NotFoundError('Notificación no encontrada');
  }

  res.status(200).json({ success: true, notification });
});

export const markAllAsRead = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado');
  }

  await NotificacionModel.updateMany({ userId, read: false }, { $set: { read: true } });

  res.status(200).json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
});

export const deleteNotificacion = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado');
  }

  const notification = await NotificacionModel.findOneAndDelete({ _id: id, userId });

  if (!notification) {
    throw new NotFoundError('Notificación no encontrada');
  }

  res.status(200).json({ success: true, message: 'Notificación eliminada correctamente' });
});

export const clearAllNotificaciones = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado');
  }

  await NotificacionModel.deleteMany({ userId });

  res.status(200).json({ success: true, message: 'Historial de notificaciones vaciado' });
});

export const markReadByType = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { type } = req.body;

  if (!userId) {
    throw new UnauthorizedError('Usuario no autenticado');
  }

  if (!type) {
    res.status(400).json({ success: false, message: 'El campo type es obligatorio' });
    return;
  }

  await NotificacionModel.updateMany({ userId, type, read: false }, { $set: { read: true } });

  res.status(200).json({ success: true, message: `Notificaciones de tipo ${type} marcadas como leídas` });
});
