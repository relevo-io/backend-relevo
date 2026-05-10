import { ISolicitud, SolicitudModel } from '../models/solicitudModel.js';

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

export const obtenerSolicitudesPorPropietario = async (ownerId: string): Promise<ISolicitud[]> => {
  return await SolicitudModel.find({ owner: ownerId })
    .populate('interestedUser', 'fullName email bio professionalBackground cv') 
    .populate('opportunity', 'companyDescription sector region')
    .sort({ createdAt: -1 })
    .lean()                                   
    .exec();
};

export const actualizarEstadoSolicitud = async (
  id: string,
  status: ISolicitud['status']
): Promise<ISolicitud | null> => {
  return await SolicitudModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
};
