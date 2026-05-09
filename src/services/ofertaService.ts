import { IOferta, OfertaModel } from '../models/ofertaModel.js';

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

export const listarOfertas = async (options?: { excludeOwnerId?: string }): Promise<IOferta[]> => {
  const filter = options?.excludeOwnerId ? { owner: { $ne: options.excludeOwnerId } } : {};

  return await OfertaModel.find(filter).lean();
};
