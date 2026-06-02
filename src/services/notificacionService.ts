import { Types } from 'mongoose';
import { NotificacionModel, INotificacion } from '../models/notificacionModel.js';

export const obtenerNotificacionesPorUsuario = async (userId: string): Promise<INotificacion[]> => {
  const notificaciones = await NotificacionModel.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();

  return notificaciones.map((notif) => ({
    _id: notif._id,
    userId: notif.userId,
    type: notif.type,
    data:
      notif.data instanceof Map
        ? Object.fromEntries(notif.data)
        : notif.data
          ? (notif.data as unknown as Record<string, string>)
          : {},
    isRead: notif.isRead,
    createdAt: notif.createdAt,
    updatedAt: notif.updatedAt
  }));
};

export const marcarComoLeida = async (userId: string, notificacionId: string): Promise<INotificacion | null> => {
  const updated = await NotificacionModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificacionId),
      userId: new Types.ObjectId(userId)
    },
    { isRead: true },
    { new: true }
  ).lean();

  if (!updated) return null;

  return {
    _id: updated._id,
    userId: updated.userId,
    type: updated.type,
    data:
      updated.data instanceof Map
        ? Object.fromEntries(updated.data)
        : updated.data
          ? (updated.data as unknown as Record<string, string>)
          : {},
    isRead: updated.isRead,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt
  };
};
