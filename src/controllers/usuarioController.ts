import { Request, Response } from 'express';
import { IUsuario } from '../models/usuarioModel.js';
import * as usuarioService from '../services/usuarioService.js';
import {
  DeleteManyUsuariosBody,
  UpdateManyUsuariosVisibilityBody,
  UpdateUsuarioVisibilityBody
} from '../validators/usuarioValidator.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError } from '../utils/AppError.js';

export const getUsuarios = asyncWrapper(async (_req: Request, res: Response) => {
  const usuarios = await usuarioService.listarUsuarios();
  res.status(200).json(usuarios);
});

export const getUsuario = asyncWrapper(async (req: Request<{ id: string }>, res: Response) => {
  const usuario = await usuarioService.obtenerUsuarioPorId(req.params.id);
  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(200).json(usuario);
});

export const createUsuario = asyncWrapper(async (req: Request<{}, {}, Partial<IUsuario>>, res: Response) => {
  const nuevoUsuario = await usuarioService.crearUsuario(req.body);
  res.status(201).json(nuevoUsuario);
});

export const updateUsuario = asyncWrapper(async (
  req: Request<{ id: string }, {}, Partial<IUsuario>>,
  res: Response
) => {
  const usuarioActualizado = await usuarioService.actualizarUsuario(req.params.id, req.body);
  if (!usuarioActualizado) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(200).json(usuarioActualizado);
});

export const deleteUsuario = asyncWrapper(async (req: Request<{ id: string }>, res: Response) => {
  const eliminado = await usuarioService.eliminarUsuario(req.params.id);
  if (!eliminado) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(204).send();
});

export const deleteManyUsuarios = asyncWrapper(async (
  req: Request<{}, {}, DeleteManyUsuariosBody>,
  res: Response
) => {
  const { ids } = req.body;
  const deletedCount = await usuarioService.eliminarUsuariosPorIds(ids);
  res.status(200).json({
    message: 'Borrado múltiple ejecutado',
    requestedCount: ids.length,
    deletedCount
  });
});

export const patchUsuarioVisibility = asyncWrapper(async (
  req: Request<{ id: string }, {}, UpdateUsuarioVisibilityBody>,
  res: Response
) => {
  const usuario = await usuarioService.actualizarVisibilidadUsuario(req.params.id, req.body.visible);
  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(200).json(usuario);
});

export const patchManyUsuariosVisibility = asyncWrapper(async (
  req: Request<{}, {}, UpdateManyUsuariosVisibilityBody>,
  res: Response
) => {
  const { ids, visible } = req.body;
  const { matchedCount, modifiedCount } = await usuarioService.actualizarVisibilidadUsuarios(ids, visible);

  res.status(200).json({
    message: 'Visibilidad de usuarios actualizada',
    requestedCount: ids.length,
    matchedCount,
    modifiedCount,
    visible
  });
});
