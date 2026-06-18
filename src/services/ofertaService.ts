import { IOferta, OfertaModel } from '../models/ofertaModel.js';
import { IUsuario, UsuarioModel } from '../models/usuarioModel.js';
import { SolicitudModel } from '../models/solicitudModel.js';
import { PaginatedResult, PaginationParams } from '../models/pagination.js';
import { procesarAlertasParaOferta } from './alertaService.js';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface OfertaAnalytics {
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

export interface OwnerAnalyticsSummary {
  publishedOffers: number;
  totalViews: number;
  totalFavorites: number;
  totalRequests: number;
  averageConversionRate: number;
}

export type OfertaConContadores = IOferta & {
  favoriteCount: number;
  detailViewCount: number;
};

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

const normalizeOferta = <T extends IOferta>(oferta: T): T & { detailViewCount: number } => ({
  ...oferta,
  detailViewCount: oferta.detailViewCount ?? 0
});

const addFavoriteCounts = async <T extends IOferta>(
  ofertas: T[]
): Promise<Array<T & { favoriteCount: number; detailViewCount: number }>> => {
  const ids = ofertas.map((oferta) => oferta._id).filter(Boolean);
  if (ids.length === 0) {
    return ofertas.map((oferta) => ({ ...normalizeOferta(oferta), favoriteCount: 0 }));
  }

  const counts = await UsuarioModel.aggregate<{ _id: string; count: number }>([
    { $match: { favoriteOfferIds: { $in: ids } } },
    { $unwind: '$favoriteOfferIds' },
    { $match: { favoriteOfferIds: { $in: ids } } },
    { $group: { _id: { $toString: '$favoriteOfferIds' }, count: { $sum: 1 } } }
  ]);
  const countsMap = new Map(counts.map((item) => [item._id, item.count]));

  return ofertas.map((oferta) => ({
    ...normalizeOferta(oferta),
    favoriteCount: countsMap.get(String(oferta._id)) ?? 0
  }));
};

const buildAnalyticsFromOferta = async (oferta: IOferta): Promise<OfertaAnalytics> => {
  const [favoriteCount, requestsByStatus] = await Promise.all([
    UsuarioModel.countDocuments({ favoriteOfferIds: oferta._id }),
    SolicitudModel.aggregate<{ _id: string; count: number }>([
      { $match: { opportunity: oferta._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const statusMap = new Map(requestsByStatus.map((item) => [item._id, item.count]));
  const requestCount = requestsByStatus.reduce((total, item) => total + item.count, 0);
  const detailViewCount = oferta.detailViewCount ?? 0;

  return {
    detailViewCount,
    favoriteCount,
    requestCount,
    requestConversionRate: detailViewCount > 0 ? Number(((requestCount / detailViewCount) * 100).toFixed(2)) : 0,
    requestsByStatus: {
      pending: statusMap.get('PENDING') ?? 0,
      accepted: statusMap.get('ACCEPTED') ?? 0,
      rejected: statusMap.get('REJECTED') ?? 0
    }
  };
};

export const crearOferta = async (data: Partial<IOferta>): Promise<IOferta> => {
  const oferta = await new OfertaModel(data).save();
  procesarAlertasParaOferta(oferta).catch(() => {});
  return oferta;
};

export const obtenerOfertaPorId = async (id: string): Promise<IOferta | null> => {
  const oferta = (await OfertaModel.findById(id).populate('owner', 'fullName email').lean()) as IOferta | null;
  return oferta ? normalizeOferta(oferta) : null;
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
  return await addFavoriteCounts(ofertas);
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

  const enrichedItems = await addFavoriteCounts(items);

  return {
    items: enrichedItems,
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
  return await addFavoriteCounts(ofertas);
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

  const enrichedItems = await addFavoriteCounts(items);

  return {
    items: enrichedItems,
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
  return await addFavoriteCounts(ofertas);
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

  const enrichedItems = await addFavoriteCounts(items);

  return {
    items: enrichedItems,
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

export const contarFavoritosOferta = async (ofertaId: string): Promise<number> => {
  return await UsuarioModel.countDocuments({ favoriteOfferIds: ofertaId });
};

export const registrarVistaOferta = async (
  id: string,
  viewer?: { id: string; roles: string[] }
): Promise<IOferta | null> => {
  const oferta = await OfertaModel.findById(id).select('owner detailViewCount').lean();
  if (!oferta) return null;

  const isAdmin = viewer?.roles.includes('ADMIN');
  const isOwner = viewer?.id === String(oferta.owner);
  if (isAdmin || isOwner) {
    return normalizeOferta(oferta);
  }

  return await OfertaModel.findByIdAndUpdate(id, { $inc: { detailViewCount: 1 } }, { new: true }).lean();
};

export const obtenerAnalyticsOferta = async (id: string): Promise<OfertaAnalytics | null> => {
  const oferta = await OfertaModel.findById(id).select('detailViewCount owner').lean();
  if (!oferta) return null;
  return await buildAnalyticsFromOferta(oferta);
};

export const obtenerAnalyticsResumenOwner = async (ownerId: string): Promise<OwnerAnalyticsSummary> => {
  const ofertas = await OfertaModel.find({ owner: ownerId }).select('_id detailViewCount').lean();
  const offerIds = ofertas.map((oferta) => oferta._id).filter(Boolean);
  const publishedOffers = ofertas.length;
  const totalViews = ofertas.reduce((total, oferta) => total + (oferta.detailViewCount ?? 0), 0);

  if (offerIds.length === 0) {
    return {
      publishedOffers: 0,
      totalViews: 0,
      totalFavorites: 0,
      totalRequests: 0,
      averageConversionRate: 0
    };
  }

  const [favoriteCounts, totalRequests] = await Promise.all([
    UsuarioModel.aggregate<{ count: number }>([
      { $match: { favoriteOfferIds: { $in: offerIds } } },
      { $unwind: '$favoriteOfferIds' },
      { $match: { favoriteOfferIds: { $in: offerIds } } },
      { $count: 'count' }
    ]),
    SolicitudModel.countDocuments({ opportunity: { $in: offerIds } })
  ]);
  const totalFavorites = favoriteCounts[0]?.count ?? 0;

  return {
    publishedOffers,
    totalViews,
    totalFavorites,
    totalRequests,
    averageConversionRate: totalViews > 0 ? Number(((totalRequests / totalViews) * 100).toFixed(2)) : 0
  };
};
