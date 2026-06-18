import { Types } from 'mongoose';
import { AlertaModel, IAlerta } from '../models/alertaModel.js';
import { IOferta } from '../models/ofertaModel.js';
import { createNotificationAndSendPush } from './notificationService.js';

export type CreateAlertaInput = {
  name?: string;
  revenueRange?: string;
  employeeRange?: string;
  region?: string;
};

const normalizeRegion = (value?: string): string => value?.trim().toLowerCase() ?? '';

const alertaMatchesOferta = (alerta: IAlerta, oferta: IOferta): boolean => {
  if (alerta.revenueRange && alerta.revenueRange !== oferta.revenueRange) return false;
  if (alerta.employeeRange && alerta.employeeRange !== oferta.employeeRange) return false;

  const alertaRegion = normalizeRegion(alerta.region);
  if (alertaRegion && !normalizeRegion(oferta.region).includes(alertaRegion)) return false;

  return true;
};

export const crearAlerta = async (userId: string, input: CreateAlertaInput): Promise<IAlerta> => {
  return await new AlertaModel({
    userId: new Types.ObjectId(userId),
    name: input.name,
    revenueRange: input.revenueRange,
    employeeRange: input.employeeRange,
    region: input.region?.trim(),
    isActive: true
  }).save();
};

export const obtenerAlertasPorUsuario = async (userId: string): Promise<IAlerta[]> => {
  return await AlertaModel.find({ userId: new Types.ObjectId(userId) })
    .populate('matchedOffers.offerId')
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
  if (!oferta._id) return;

  const alertas = await AlertaModel.find({
    isActive: true,
    userId: { $ne: oferta.owner }
  });

  const alertasCoincidentes = alertas.filter((alerta) => alertaMatchesOferta(alerta, oferta));
  if (alertasCoincidentes.length === 0) return;

  const promises = alertasCoincidentes.map(async (alerta) => {
    const offerId = oferta._id as Types.ObjectId;
    const alreadyMatched = alerta.matchedOffers?.some((match) => match.offerId.toString() === offerId.toString());
    if (alreadyMatched) return;

    alerta.matchedOffers = [...(alerta.matchedOffers ?? []), { offerId, matchedAt: new Date() }];
    await alerta.save();

    const title = 'Nueva oferta disponible';
    const body = `Se ha publicado una nueva oferta en ${oferta.region || 'Relevo'} que coincide con tu alerta ${
      alerta.name ? `"${alerta.name}"` : 'de ofertas'
    }.`;
    const metadata = {
      sector: oferta.sector || '',
      alertaId: alerta._id!.toString(),
      offerId: offerId.toString(),
      click_action: `/ofertas/${offerId.toString()}`
    };

    return createNotificationAndSendPush(alerta.userId.toString(), title, body, 'alerta', metadata, 'offerAlerts');
  });

  await Promise.all(promises);
};
