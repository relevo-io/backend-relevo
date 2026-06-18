import { Types } from 'mongoose';
import { IOferta, OfertaModel } from '../models/ofertaModel.js';
import { IUsuario, UsuarioModel } from '../models/usuarioModel.js';
import { SolicitudModel } from '../models/solicitudModel.js';
import { PaginatedResult, PaginationParams } from '../models/pagination.js';

export interface OfertaAnalyticsDto {
  detailViewCount: number;
  favoriteCount: number;
  requestCount: number;
  requestConversionRate: number;
  requestsByStatus: {
    pending: number;
    accepted: number;
    rejected: number;
  };
}

export interface OwnerAnalyticsSummaryDto {
  offerCount: number;
  totalDetailViews: number;
  totalFavorites: number;
  totalRequests: number;
  requestConversionRate: number;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildOfertaFilter = async (options?: { excludeOwnerId?: string; search?: string }) => {
  const filter: Record<string, unknown> = {};
  if (options?.excludeOwnerId) {
    filter.owner = { $ne: options.excludeOwnerId };
  }

  const search = options?.search?.trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    const usuariosCoincidentes = await UsuarioModel.find({ fullName: regex }).select('_id').lean();
    const idsUsuarios = usuariosCoincidentes.map((u: IUsuario) => u._id);
    filter.$or = [
      { sector: regex },
      { region: regex },
      { companyDescription: regex },
      { revenueRange: regex },
      { employeeRange: regex },
      { owner: { $in: idsUsuarios } }
    ];
  }

  return filter;
};

const getOfferIds = (ofertas: IOferta[]): Types.ObjectId[] =>
  ofertas
    .map((oferta) => oferta._id)
    .filter((id): id is Types.ObjectId => !!id)
    .map((id) => new Types.ObjectId(String(id)));

const getFavoriteCountsByOfferId = async (offerIds: Types.ObjectId[]): Promise<Map<string, number>> => {
  if (offerIds.length === 0) return new Map();

  const rows = await UsuarioModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $unwind: '$favoriteOfferIds' },
    { $match: { favoriteOfferIds: { $in: offerIds } } },
    { $group: { _id: '$favoriteOfferIds', count: { $sum: 1 } } }
  ]);

  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const enrichOfertaCounters = (oferta: IOferta, favoriteCounts: Map<string, number>): IOferta => ({
  ...oferta,
  detailViewCount: oferta.detailViewCount ?? 0,
  favoriteCount: favoriteCounts.get(String(oferta._id)) ?? 0
});

const enrichOfertasCounters = async (ofertas: IOferta[]): Promise<IOferta[]> => {
  const favoriteCounts = await getFavoriteCountsByOfferId(getOfferIds(ofertas));
  return ofertas.map((oferta) => enrichOfertaCounters(oferta, favoriteCounts));
};

const calculateConversionRate = (requests: number, views: number): number => {
  if (views <= 0) return 0;
  return Number(((requests / views) * 100).toFixed(2));
};

export const crearOferta = async (data: Partial<IOferta>): Promise<IOferta> => {
  return await new OfertaModel(data).save();
};

export const obtenerOfertaPorId = async (id: string): Promise<IOferta | null> => {
  const oferta = (await OfertaModel.findById(id).populate('owner', 'fullName email').lean()) as IOferta | null;
  if (!oferta) return null;
  const [enriched] = await enrichOfertasCounters([oferta]);
  return enriched;
};

export const actualizarOferta = async (id: string, data: Partial<IOferta>): Promise<IOferta | null> => {
  return await OfertaModel.findByIdAndUpdate(id, data, { new: true }).lean();
};

export const eliminarOferta = async (id: string): Promise<IOferta | null> => {
  return await OfertaModel.findByIdAndDelete(id).lean();
};

export const listarOfertas = async (options?: { excludeOwnerId?: string; search?: string }): Promise<IOferta[]> => {
  const filter = await buildOfertaFilter(options);
  const ofertas = await OfertaModel.find(filter).lean();
  return enrichOfertasCounters(ofertas);
};

export const listarOfertasPaginadas = async (
  pagination: PaginationParams,
  options?: { excludeOwnerId?: string; search?: string }
): Promise<PaginatedResult<IOferta>> => {
  const filter = await buildOfertaFilter(options);
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    OfertaModel.find(filter)
      .populate('owner', 'fullName email') // Añadido el populate aquí
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean() as Promise<IOferta[]>,
    OfertaModel.countDocuments(filter)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items: await enrichOfertasCounters(items),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

export const obtenerOfertasPorOwner = async (ownerId: string): Promise<IOferta[]> => {
  const ofertas = await OfertaModel.find({ owner: ownerId }).sort({ createdAt: -1 }).lean();
  return enrichOfertasCounters(ofertas);
};

export const obtenerOfertasPorOwnerPaginadas = async (
  ownerId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<IOferta>> => {
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;
  const filter = { owner: ownerId };

  const [items, totalItems] = await Promise.all([
    OfertaModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OfertaModel.countDocuments(filter)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items: await enrichOfertasCounters(items),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

export const obtenerOfertasFavoritas = async (userId: string): Promise<IOferta[]> => {
  const usuario = await UsuarioModel.findById(userId).select('favoriteOfferIds').lean();
  const ids = usuario?.favoriteOfferIds ?? [];
  if (ids.length === 0) return [];

  const ofertas = await OfertaModel.find({ _id: { $in: ids } })
    .sort({ createdAt: -1 })
    .lean();
  return enrichOfertasCounters(ofertas);
};

export const obtenerOfertasFavoritasPaginadas = async (
  userId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<IOferta>> => {
  const usuario = await UsuarioModel.findById(userId).select('favoriteOfferIds').lean();
  const ids = usuario?.favoriteOfferIds ?? [];
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;

  if (ids.length === 0) {
    return {
      items: [],
      pagination: {
        page,
        limit,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: page > 1
      }
    };
  }

  const filter = { _id: { $in: ids } };
  const [items, totalItems] = await Promise.all([
    OfertaModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OfertaModel.countDocuments(filter)
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items: await enrichOfertasCounters(items),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
};

export const agregarOfertaAFavoritos = async (userId: string, ofertaId: string): Promise<void> => {
  await UsuarioModel.findByIdAndUpdate(userId, { $addToSet: { favoriteOfferIds: ofertaId } });
};

export const quitarOfertaDeFavoritos = async (userId: string, ofertaId: string): Promise<void> => {
  await UsuarioModel.findByIdAndUpdate(userId, { $pull: { favoriteOfferIds: ofertaId } });
};

export const registrarVistaDetalle = async (
  ofertaId: string,
  viewer?: { id: string; roles: string[] }
): Promise<IOferta | null> => {
  const oferta = await OfertaModel.findById(ofertaId).select('owner detailViewCount').lean();
  if (!oferta) return null;

  const isAdmin = viewer?.roles.includes('ADMIN') ?? false;
  const isOwner = viewer?.id === String(oferta.owner);
  if (isAdmin || isOwner) {
    return enrichOfertaCounters(oferta as IOferta, new Map());
  }

  const updated = await OfertaModel.findByIdAndUpdate(ofertaId, { $inc: { detailViewCount: 1 } }, { new: true }).lean();

  return updated ? enrichOfertaCounters(updated, new Map()) : null;
};

export const obtenerAnaliticaOferta = async (ofertaId: string): Promise<OfertaAnalyticsDto | null> => {
  const oferta = await OfertaModel.findById(ofertaId).select('detailViewCount').lean();
  if (!oferta) return null;

  const [favoriteCounts, solicitudesPorEstado] = await Promise.all([
    getFavoriteCountsByOfferId([new Types.ObjectId(ofertaId)]),
    SolicitudModel.aggregate<{ _id: string; count: number }>([
      { $match: { opportunity: new Types.ObjectId(ofertaId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const requestsByStatus = { pending: 0, accepted: 0, rejected: 0 };
  for (const row of solicitudesPorEstado) {
    if (row._id === 'PENDING') requestsByStatus.pending = row.count;
    if (row._id === 'ACCEPTED') requestsByStatus.accepted = row.count;
    if (row._id === 'REJECTED') requestsByStatus.rejected = row.count;
  }

  const requestCount = requestsByStatus.pending + requestsByStatus.accepted + requestsByStatus.rejected;
  const detailViewCount = oferta.detailViewCount ?? 0;

  return {
    detailViewCount,
    favoriteCount: favoriteCounts.get(ofertaId) ?? 0,
    requestCount,
    requestConversionRate: calculateConversionRate(requestCount, detailViewCount),
    requestsByStatus
  };
};

export const obtenerResumenAnaliticaOwner = async (ownerId: string): Promise<OwnerAnalyticsSummaryDto> => {
  const ofertas = await OfertaModel.find({ owner: ownerId }).select('_id detailViewCount').lean();
  const offerIds = getOfferIds(ofertas);
  const totalDetailViews = ofertas.reduce((total, oferta) => total + (oferta.detailViewCount ?? 0), 0);

  const [favoriteCounts, totalRequests] = await Promise.all([
    getFavoriteCountsByOfferId(offerIds),
    offerIds.length > 0 ? SolicitudModel.countDocuments({ opportunity: { $in: offerIds } }) : Promise.resolve(0)
  ]);

  const totalFavorites = Array.from(favoriteCounts.values()).reduce((total, count) => total + count, 0);

  return {
    offerCount: ofertas.length,
    totalDetailViews,
    totalFavorites,
    totalRequests,
    requestConversionRate: calculateConversionRate(totalRequests, totalDetailViews)
  };
};
