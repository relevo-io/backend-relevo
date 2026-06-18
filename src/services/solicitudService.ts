import { ISolicitud, SolicitudModel } from '../models/solicitudModel.js';
import { PaginatedResult, PaginationParams } from '../models/pagination.js';
import { obtenerResumenRatingsPorUsuarios } from './ratingService.js';
import { ForbiddenError } from '../utils/AppError.js';
import { isProActive, obtenerAccesoUsuario } from './usuarioService.js';

const getUserId = (user: unknown): string | null => {
  if (!user) return null;
  if (typeof user === 'object' && '_id' in user) return String((user as { _id: unknown })._id);
  return String(user);
};

const addInterestedRatings = async <T extends ISolicitud>(items: T[]): Promise<T[]> => {
  const userIds = [
    ...new Set(items.map((item) => getUserId(item.interestedUser)).filter((id): id is string => Boolean(id)))
  ];
  const ratings = await obtenerResumenRatingsPorUsuarios(userIds, 'INTERESTED');

  return items.map((item) => {
    const userId = getUserId(item.interestedUser);
    const interestedUser =
      typeof item.interestedUser === 'object'
        ? {
            ...(item.interestedUser as object),
            ratingAsInterested: userId ? (ratings.get(userId) ?? { average: 0, count: 0 }) : { average: 0, count: 0 }
          }
        : item.interestedUser;
    return { ...item, interestedUser } as T;
  });
};

const addOwnerRatings = async <T extends ISolicitud>(items: T[]): Promise<T[]> => {
  const userIds = [...new Set(items.map((item) => getUserId(item.owner)).filter((id): id is string => Boolean(id)))];
  const ratings = await obtenerResumenRatingsPorUsuarios(userIds, 'OWNER');

  return items.map((item) => {
    const userId = getUserId(item.owner);
    const owner =
      typeof item.owner === 'object'
        ? {
            ...(item.owner as object),
            ratingAsOwner: userId ? (ratings.get(userId) ?? { average: 0, count: 0 }) : { average: 0, count: 0 }
          }
        : item.owner;
    return { ...item, owner } as T;
  });
};

export const crearSolicitud = async (data: Partial<ISolicitud>): Promise<ISolicitud> => {
  const yaExiste = await SolicitudModel.findOne({
    opportunity: data.opportunity,
    interestedUser: data.interestedUser
  }).lean();

  if (yaExiste) {
    throw new Error('Solicitud ya existente para esta oferta');
  }

  const interestedUserId = data.interestedUser ? String(data.interestedUser) : null;
  if (interestedUserId) {
    const usuario = await obtenerAccesoUsuario(interestedUserId);
    const isAdmin = usuario?.roles?.includes('ADMIN') ?? false;

    if (usuario && !isAdmin && !isProActive(usuario)) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentRequestsCount = await SolicitudModel.countDocuments({
        interestedUser: data.interestedUser,
        createdAt: { $gte: sevenDaysAgo }
      });

      if (recentRequestsCount >= 1) {
        throw new ForbiddenError('MONETIZATION.REQUESTS_LIMIT_REACHED');
      }
    }
  }

  return await new SolicitudModel(data).save();
};

export const obtenerSolicitudPorId = async (id: string): Promise<ISolicitud | null> => {
  return await SolicitudModel.findById(id).lean();
};

export const actualizarSolicitud = async (id: string, data: Partial<ISolicitud>): Promise<ISolicitud | null> => {
  return await SolicitudModel.findByIdAndUpdate(id, data, { new: true }).lean();
};

export const eliminarSolicitud = async (id: string): Promise<ISolicitud | null> => {
  return await SolicitudModel.findByIdAndDelete(id).lean();
};

export const listarSolicitudes = async (): Promise<ISolicitud[]> => {
  return await SolicitudModel.find()
    .populate('interestedUser', 'fullName email')

    .populate('opportunity', 'companyDescription')
    .lean()
    .exec();
};

export const listarSolicitudesPaginadas = async (
  pagination: PaginationParams
): Promise<PaginatedResult<ISolicitud>> => {
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;

  const [items, totalItems] = await Promise.all([
    SolicitudModel.find()
      .populate('interestedUser', 'fullName email')
      .populate('opportunity', 'companyDescription')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    SolicitudModel.countDocuments()
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

export const obtenerSolicitudesPorPropietario = async (ownerId: string): Promise<ISolicitud[]> => {
  const items = await SolicitudModel.find({ owner: ownerId })
    .populate('interestedUser', 'fullName email bio professionalBackground cv')
    .populate('opportunity', 'companyDescription sector region')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return await addInterestedRatings(items);
};

export const obtenerSolicitudesPorPropietarioPaginadas = async (
  ownerId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<ISolicitud>> => {
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;
  const filter = { owner: ownerId };

  const [items, totalItems] = await Promise.all([
    SolicitudModel.find(filter)
      .populate('interestedUser', 'fullName email bio professionalBackground cv')
      .populate('opportunity', 'companyDescription sector region')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    SolicitudModel.countDocuments(filter)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items: await addInterestedRatings(items),
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

export const obtenerSolicitudesPorInteresado = async (userId: string): Promise<ISolicitud[]> => {
  const items = await SolicitudModel.find({ interestedUser: userId })
    .populate('interestedUser', 'fullName email')
    .populate('owner', 'fullName email')
    .populate('opportunity', 'companyDescription sector region')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  return await addOwnerRatings(items);
};

export const obtenerSolicitudesPorInteresadoPaginadas = async (
  userId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<ISolicitud>> => {
  const page = Math.max(1, pagination.page);
  const limit = Math.max(1, pagination.limit);
  const skip = (page - 1) * limit;
  const filter = { interestedUser: userId };

  const [items, totalItems] = await Promise.all([
    SolicitudModel.find(filter)
      .populate('interestedUser', 'fullName email')
      .populate('owner', 'fullName email')
      .populate('opportunity', 'companyDescription sector region')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    SolicitudModel.countDocuments(filter)
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items: await addOwnerRatings(items),
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

export const actualizarEstadoSolicitud = async (
  id: string,
  status: ISolicitud['status']
): Promise<ISolicitud | null> => {
  return await SolicitudModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
};

export const obtenerSolicitudConDetalles = async (id: string): Promise<ISolicitud | null> => {
  return await SolicitudModel.findById(id).populate('opportunity').populate('interestedUser').lean();
};

export const eliminarSolicitudesPorIds = async (ids: string[]): Promise<number> => {
  const result = await SolicitudModel.deleteMany({ _id: { $in: ids } });
  return result.deletedCount ?? 0;
};

export const obtenerSolicitudPorOfertaYUsuario = async (
  ofertaId: string,
  userId: string
): Promise<ISolicitud | null> => {
  return await SolicitudModel.findOne({ opportunity: ofertaId, interestedUser: userId }).lean();
};
