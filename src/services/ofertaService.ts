import { IOferta, OfertaModel } from '../models/ofertaModel.js';
import { UsuarioModel } from '../models/usuarioModel.js';
import { PaginatedResult, PaginationParams } from '../models/pagination.js';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildOfertaFilter = (options?: { excludeOwnerId?: string; search?: string }) => {
  const filter: Record<string, unknown> = {};
  if (options?.excludeOwnerId) {
    filter.owner = { $ne: options.excludeOwnerId };
  }

  const search = options?.search?.trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { sector: regex },
      { region: regex },
      { companyDescription: regex },
      { revenueRange: regex },
      { employeeRange: regex }
    ];
  }

  return filter;
};

export const crearOferta = async (data: Partial<IOferta>): Promise<IOferta> => {
  return await new OfertaModel(data).save();
};

export const obtenerOfertaPorId = async (id: string): Promise<IOferta | null> => {
  return await OfertaModel.findById(id).lean();
};

export const actualizarOferta = async (id: string, data: Partial<IOferta>): Promise<IOferta | null> => {
  return await OfertaModel.findByIdAndUpdate(id, data, { new: true }).lean();
};

export const eliminarOferta = async (id: string): Promise<IOferta | null> => {
  return await OfertaModel.findByIdAndDelete(id).lean();
};

export const listarOfertas = async (options?: { excludeOwnerId?: string; search?: string }): Promise<IOferta[]> => {
  const filter = buildOfertaFilter(options);
  return await OfertaModel.find(filter).lean();
};

export const listarOfertasPaginadas = async (
  pagination: PaginationParams,
  options?: { excludeOwnerId?: string; search?: string }
): Promise<PaginatedResult<IOferta>> => {
  const filter = buildOfertaFilter(options);
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    OfertaModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OfertaModel.countDocuments(filter)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items,
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
  return await OfertaModel.find({ owner: ownerId }).sort({ createdAt: -1 }).lean();
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
    items,
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

  return await OfertaModel.find({ _id: { $in: ids } })
    .sort({ createdAt: -1 })
    .lean();
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
    items,
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
