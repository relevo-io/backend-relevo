import { ISolicitud, SolicitudModel } from '../models/solicitudModel.js';
import { PaginatedResult, PaginationParams } from '../models/pagination.js';

export const crearSolicitud = async (data: Partial<ISolicitud>): Promise<ISolicitud> => {
  const yaExiste = await SolicitudModel.findOne({
    opportunity: data.opportunity,
    interestedUser: data.interestedUser
  }).lean();

  if (yaExiste) {
    throw new Error('Solicitud ya existente para esta oferta');
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
  return await SolicitudModel.find({ owner: ownerId })
    .populate('interestedUser', 'fullName email bio professionalBackground cv')
    .populate('opportunity', 'companyDescription sector region')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
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

export const obtenerSolicitudesPorInteresado = async (userId: string): Promise<ISolicitud[]> => {
  return await SolicitudModel.find({ interestedUser: userId })
    .populate('interestedUser', 'fullName email')
    .populate('owner', 'fullName email')
    .populate('opportunity', 'companyDescription sector region')
    .sort({ createdAt: -1 })
    .lean()
    .exec();
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
