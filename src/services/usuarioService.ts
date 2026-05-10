import { IUsuario, UsuarioModel } from '../models/usuarioModel.js';

export const crearUsuario = async (data: Partial<IUsuario>): Promise<IUsuario> => {
  return await new UsuarioModel(data).save();
};

export const obtenerUsuarioPorId = async (id: string): Promise<IUsuario | null> => {
  return await UsuarioModel.findById(id).select('-password').lean();
};

export const actualizarUsuario = async (id: string, data: Partial<IUsuario>): Promise<IUsuario | null> => {
  return await UsuarioModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).lean();
};

export const eliminarUsuario = async (id: string): Promise<IUsuario | null> => {
  return await UsuarioModel.findByIdAndDelete(id).lean();
};

export const eliminarUsuariosPorIds = async (ids: string[]): Promise<number> => {
  const result = await UsuarioModel.deleteMany({ _id: { $in: ids } });
  return result.deletedCount ?? 0;
};

export const actualizarVisibilidadUsuario = async (id: string, visible: boolean): Promise<IUsuario | null> => {
  return await UsuarioModel.findByIdAndUpdate(id, { visible }, { returnDocument: 'after' }).lean();
};

export const actualizarVisibilidadUsuarios = async (
  ids: string[],
  visible: boolean
): Promise<{ matchedCount: number; modifiedCount: number }> => {
  const result = await UsuarioModel.updateMany({ _id: { $in: ids } }, { $set: { visible } });
  return {
    matchedCount: result.matchedCount ?? 0,
    modifiedCount: result.modifiedCount ?? 0
  };
};

export const listarUsuarios = async (): Promise<IUsuario[]> => {
  return await UsuarioModel.find().select('-password').lean();
};
