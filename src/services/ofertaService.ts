import { IOferta, OfertaModel } from '../models/ofertaModel.js';
import { IUsuario, UsuarioModel } from '../models/usuarioModel.js';
import { SolicitudModel } from '../models/solicitudModel.js';
import { PaginatedResult, PaginationParams } from '../models/pagination.js';
import { procesarAlertasParaOferta } from './alertaService.js';
import { RatingSummary, obtenerResumenRating, obtenerResumenRatingsPorUsuarios } from './ratingService.js';
import { ForbiddenError } from '../utils/AppError.js';
import { isProActive, obtenerAccesoUsuario } from './usuarioService.js';
import Historial, { ICanvi } from '../models/historialModel.js';

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
  ownerRating?: RatingSummary;
};

interface OfertaListOptions {
  excludeOwnerId?: string;
  search?: string;
  sector?: string;
  region?: string;
  revenueRange?: string;
  employeeRange?: string;
  creationYearFrom?: number;
  creationYearTo?: number;
  viewerId?: string;
}

type UsuarioAccesoOferta = NonNullable<Awaited<ReturnType<typeof obtenerAccesoUsuario>>>;

const hasAdvancedFilters = (options?: OfertaListOptions): boolean =>
  Boolean(
    options?.sector ||
    options?.region ||
    options?.revenueRange ||
    options?.employeeRange ||
    options?.creationYearFrom !== undefined ||
    options?.creationYearTo !== undefined
  );

const assertAdvancedFiltersAllowed = (
  options: OfertaListOptions | undefined,
  viewer: UsuarioAccesoOferta | null
): void => {
  if (!hasAdvancedFilters(options)) {
    return;
  }

  const isAdmin = viewer?.roles?.includes('ADMIN') ?? false;
  if (!viewer || (!isAdmin && !isProActive(viewer))) {
    throw new ForbiddenError('MONETIZATION.PRO_REQUIRED_FILTERS');
  }
};

const buildOfertaFilter = async (options?: OfertaListOptions) => {
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

  if (options?.sector?.trim()) {
    filter.sector = new RegExp(`^${escapeRegex(options.sector.trim())}$`, 'i');
  }

  if (options?.region?.trim()) {
    filter.region = new RegExp(escapeRegex(options.region.trim()), 'i');
  }

  if (options?.revenueRange) {
    filter.revenueRange = options.revenueRange;
  }

  if (options?.employeeRange) {
    filter.employeeRange = options.employeeRange;
  }

  if (options?.creationYearFrom !== undefined || options?.creationYearTo !== undefined) {
    filter.creationYear = {
      ...(options.creationYearFrom !== undefined ? { $gte: options.creationYearFrom } : {}),
      ...(options.creationYearTo !== undefined ? { $lte: options.creationYearTo } : {})
    };
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

const preferenceScoreForOferta = (oferta: IOferta, usuario: UsuarioAccesoOferta): number => {
  let score = 0;

  if (usuario.preferredRegions?.some((region) => region.trim().toLowerCase() === oferta.region.trim().toLowerCase())) {
    score += 3;
  }

  if (usuario.preferredSectors?.some((sector) => sector.trim().toLowerCase() === oferta.sector.trim().toLowerCase())) {
    score += 3;
  }

  if (oferta.employeeRange && usuario.preferredEmployeeRanges?.includes(oferta.employeeRange)) {
    score += 2;
  }

  if (oferta.revenueRange && usuario.preferredRevenueRanges?.includes(oferta.revenueRange)) {
    score += 2;
  }

  if (
    oferta.creationYear &&
    usuario.preferredCreationYearFrom !== undefined &&
    usuario.preferredCreationYearTo !== undefined &&
    oferta.creationYear >= usuario.preferredCreationYearFrom &&
    oferta.creationYear <= usuario.preferredCreationYearTo
  ) {
    score += 1;
  }

  return score;
};

const hasMarketplacePreferences = (usuario: UsuarioAccesoOferta | null): usuario is UsuarioAccesoOferta =>
  Boolean(
    usuario &&
    (usuario.preferredRegions?.length ||
      usuario.preferredSectors?.length ||
      usuario.preferredEmployeeRanges?.length ||
      usuario.preferredRevenueRanges?.length ||
      usuario.preferredCreationYearFrom !== undefined ||
      usuario.preferredCreationYearTo !== undefined)
  );

const randomComparator = (): number => Math.random() - 0.5;

const sortByNewest = <T extends IOferta>(items: T[]): T[] =>
  [...items].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

const sortOffersForViewer = <T extends OfertaConContadores>(
  items: T[],
  options?: OfertaListOptions,
  viewer?: UsuarioAccesoOferta | null
): T[] => {
  const shouldApplyInitialSort = !options?.search?.trim() && !hasAdvancedFilters(options);
  if (!shouldApplyInitialSort) {
    return sortByNewest(items);
  }

  if (viewer && hasMarketplacePreferences(viewer)) {
    return [...items].sort((a, b) => {
      const scoreDiff = preferenceScoreForOferta(b, viewer) - preferenceScoreForOferta(a, viewer);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
  }

  return [...items].sort(randomComparator);
};

const getOwnerId = (oferta: IOferta): string | null => {
  const owner = oferta.owner as unknown as string | { _id?: string };
  if (!owner) return null;
  return typeof owner === 'object' ? String(owner._id) : String(owner);
};

const addOwnerRatings = async <T extends IOferta>(
  ofertas: Array<T & { favoriteCount: number; detailViewCount: number }>
): Promise<Array<T & { favoriteCount: number; detailViewCount: number; ownerRating: RatingSummary }>> => {
  const ownerIds = [...new Set(ofertas.map(getOwnerId).filter((id): id is string => Boolean(id)))];
  const ratings = await obtenerResumenRatingsPorUsuarios(ownerIds, 'OWNER');

  return ofertas.map((oferta) => {
    const ownerId = getOwnerId(oferta);
    return {
      ...oferta,
      ownerRating: ownerId ? (ratings.get(ownerId) ?? { average: 0, count: 0 }) : { average: 0, count: 0 }
    };
  });
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
  if (!oferta) return null;
  const ownerId = getOwnerId(oferta);
  const ownerRating = ownerId ? await obtenerResumenRating(ownerId, 'OWNER') : { average: 0, count: 0 };
  return { ...normalizeOferta(oferta), ownerRating } as IOferta;
};

const obtenerCambios = <T extends object, U extends object>(ofertaOriginal: T, ofertaActualizada: U): ICanvi[] => {
  const canvis: ICanvi[] = [];
  const original = ofertaOriginal as Record<string, unknown>;
  const actualizado = ofertaActualizada as Record<string, unknown>;

  for (const llave in actualizado) {
    if (['id', '_id', '__v', 'createdAt', 'updatedAt'].includes(llave)) continue;

    const valorOriginal = original[llave];
    const valorNuevo = actualizado[llave];

    const strOriginal = JSON.stringify(valorOriginal);
    const strNuevo = JSON.stringify(valorNuevo);
    if (strOriginal !== strNuevo) {
      canvis.push({
        campo: llave,
        valorAnterior: valorOriginal,
        valorNuevo: valorNuevo
      });
    }
  }
  return canvis;
};

export const actualizarOferta = async (id: string, data: Partial<IOferta>): Promise<IOferta | null> => {
  const ofertaOriginal = await OfertaModel.findById(id).lean();

  if (!ofertaOriginal) {
    throw new Error('Oferta no encontrada');
  }

  const canvis = obtenerCambios(ofertaOriginal, data);

  if (canvis.length > 0) {
    await Historial.create({
      ofertaId: id,
      canvis: canvis
    });

    return await OfertaModel.findByIdAndUpdate(id, data, { new: true }).lean();
  } else {
    return ofertaOriginal;
  }
};

export const eliminarOferta = async (id: string): Promise<IOferta | null> => {
  const oferta = await OfertaModel.findById(id).lean();
  if (!oferta) {
    return null;
  }
  await Historial.create({
    ofertaId: id,
    canvis: [
      {
        campo: 'Estado de la oferta',
        valorAnterior: 'Activa',
        valorNuevo: 'ELIMINADA 🗑️'
      }
    ]
  });
  return await OfertaModel.findByIdAndDelete(id).lean();
};

export const listarOfertas = async (options?: OfertaListOptions): Promise<IOferta[]> => {
  const viewer = options?.viewerId ? await obtenerAccesoUsuario(options.viewerId) : null;
  assertAdvancedFiltersAllowed(options, viewer);
  const filter = await buildOfertaFilter(options);
  const ofertas = await OfertaModel.find(filter).lean();
  return sortOffersForViewer(await addOwnerRatings(await addFavoriteCounts(ofertas)), options, viewer);
};

export const listarOfertasPaginadas = async (
  pagination: PaginationParams,
  options?: OfertaListOptions
): Promise<PaginatedResult<IOferta>> => {
  const viewer = options?.viewerId ? await obtenerAccesoUsuario(options.viewerId) : null;
  assertAdvancedFiltersAllowed(options, viewer);
  const filter = await buildOfertaFilter(options);
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    OfertaModel.find(filter).populate('owner', 'fullName email').lean() as Promise<IOferta[]>,
    OfertaModel.countDocuments(filter)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const enrichedItems = sortOffersForViewer(
    await addOwnerRatings(await addFavoriteCounts(items)),
    options,
    viewer
  ).slice(skip, skip + limit);

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
  return await addOwnerRatings(await addFavoriteCounts(ofertas));
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

  const enrichedItems = await addOwnerRatings(await addFavoriteCounts(items));

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
  return await addOwnerRatings(await addFavoriteCounts(ofertas));
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

  const enrichedItems = await addOwnerRatings(await addFavoriteCounts(items));

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
  const usuario = await obtenerAccesoUsuario(userId);
  if (!usuario) {
    throw new ForbiddenError('No autorizado');
  }

  const favorites = usuario.favoriteOfferIds ?? [];
  const alreadyFavorite = favorites.some((id) => String(id) === ofertaId);
  const isAdmin = usuario.roles?.includes('ADMIN') ?? false;

  if (!alreadyFavorite && !isAdmin && !isProActive(usuario) && favorites.length >= 3) {
    throw new ForbiddenError('MONETIZATION.FAVORITES_LIMIT_REACHED');
  }

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
