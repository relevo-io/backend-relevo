import { ISolicitud, SolicitudModel } from '../models/solicitudModel.js';

export const crearSolicitud = async (data: Partial<ISolicitud>): Promise<ISolicitud> => {
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

export const eliminarSolicitudesPorIds = async (ids: string[]): Promise<number> => {
  const result = await SolicitudModel.deleteMany({ _id: { $in: ids } });
  return result.deletedCount ?? 0;
};

export const listarSolicitudes = async (): Promise<ISolicitud[]> => {
  return await SolicitudModel.find()
    .populate('interestedUser', 'nombre email') 
    .populate('opportunity', 'companyDescription')
    .lean()                                   
    .exec();
};

export const actualizarEstadoSolicitud = async (
  id: string,
  status: ISolicitud['status']
): Promise<ISolicitud | null> => {
  return await SolicitudModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
};
