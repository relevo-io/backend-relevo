import { Types } from 'mongoose';
import { AlertaModel, IAlerta } from '../models/alertaModel.js';
import { NotificacionModel } from '../models/notificacionModel.js';
import { IOferta } from '../models/ofertaModel.js';

export const crearAlerta = async (userId: string, revenueRange: string): Promise<IAlerta> => {
  const existing = await AlertaModel.findOne({ userId: new Types.ObjectId(userId), revenueRange });
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      return await existing.save();
    }
    return existing;
  }
  return await new AlertaModel({
    userId: new Types.ObjectId(userId),
    revenueRange,
    isActive: true
  }).save();
};

export const obtenerAlertasPorUsuario = async (userId: string): Promise<IAlerta[]> => {
  return await AlertaModel.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();
};

export const eliminarAlerta = async (userId: string, alertaId: string): Promise<IAlerta | null> => {
  return await AlertaModel.findOneAndDelete({
    _id: new Types.ObjectId(alertaId),
    userId: new Types.ObjectId(userId)
  }).lean();
};

export const procesarAlertasParaOferta = async (oferta: IOferta): Promise<void> => {
  if (!oferta.revenueRange || !oferta._id) return;

  const alertas = await AlertaModel.find({
    revenueRange: oferta.revenueRange,
    isActive: true,
    userId: { $ne: oferta.owner }
  }).lean();

  if (alertas.length === 0) return;

  const notificaciones = alertas.map((alerta) => ({
    userId: alerta.userId,
    type: 'NUEVA_OFERTA',
    data: {
      sector: oferta.sector,
      offerId: (oferta._id as Types.ObjectId).toString()
    },
    isRead: false
  }));

  await NotificacionModel.insertMany(notificaciones);
};
