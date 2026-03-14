import { IUsuario, UsuarioModel } from '../models/usuarioModel.js';

export const crearUsuario = async (data: Partial<IUsuario>): Promise<IUsuario> => {
  return await new UsuarioModel(data).save();
};

export const obtenerUsuarioPorId = async (id: string): Promise<IUsuario | null> => {
  return await UsuarioModel.findById(id).lean();
};

export const actualizarUsuario = async (id: string, data: Partial<IUsuario>): Promise<IUsuario | null> => {
  return await UsuarioModel.findByIdAndUpdate(id, data, { new: true }).lean();
};

export const eliminarUsuario = async (id: string): Promise<IUsuario | null> => {
  return await UsuarioModel.findByIdAndDelete(id).lean();
};

export const listarUsuarios = async (): Promise<IUsuario[]> => {
  return await UsuarioModel.find().lean();
};
