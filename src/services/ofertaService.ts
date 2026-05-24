import { IOferta, OfertaModel } from '../models/ofertaModel.js';
import { UsuarioModel } from '../models/usuarioModel.js';

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

export const obtenerOfertasPorOwner = async (ownerId: string): Promise<IOferta[]> => {
  return await OfertaModel.find({ owner: ownerId }).sort({ createdAt: -1 }).lean();
};

export const obtenerOfertasFavoritas = async (userId: string): Promise<IOferta[]> => {
  const usuario = await UsuarioModel.findById(userId).select('favoriteOfferIds').lean();
  const ids = usuario?.favoriteOfferIds ?? [];
  if (ids.length === 0) return [];

  return await OfertaModel.find({ _id: { $in: ids } })
    .sort({ createdAt: -1 })
    .lean();
};

export const agregarOfertaAFavoritos = async (userId: string, ofertaId: string): Promise<void> => {
  await UsuarioModel.findByIdAndUpdate(userId, { $addToSet: { favoriteOfferIds: ofertaId } });
};

export const quitarOfertaDeFavoritos = async (userId: string, ofertaId: string): Promise<void> => {
  await UsuarioModel.findByIdAndUpdate(userId, { $pull: { favoriteOfferIds: ofertaId } });
};
