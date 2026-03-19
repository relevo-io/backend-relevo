import { NextFunction, Request, Response } from 'express';
import { IUsuario } from '../models/usuarioModel.js';
import * as usuarioService from '../services/usuarioService.js';
import {
  DeleteManyUsuariosBody,
  UpdateManyUsuariosVisibilityBody,
  UpdateUsuarioVisibilityBody
} from '../validators/usuarioValidator.js';

export const getUsuarios = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarios = await usuarioService.listarUsuarios();
    res.status(200).json(usuarios);
  } catch (error) {
    next(error);
  }
};

export const getUsuario = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario = await usuarioService.obtenerUsuarioPorId(req.params.id);
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const createUsuario = async (req: Request<{}, {}, Partial<IUsuario>>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nuevoUsuario = await usuarioService.crearUsuario(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    next(error);
  }
};

export const updateUsuario = async (req: Request<{ id: string }, {}, Partial<IUsuario>>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuarioActualizado = await usuarioService.actualizarUsuario(req.params.id, req.body);
    if (!usuarioActualizado) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(usuarioActualizado);
  } catch (error) {
    next(error);
  }
};

export const deleteUsuario = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eliminado = await usuarioService.eliminarUsuario(req.params.id);
    if (!eliminado) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const deleteManyUsuarios = async (req: Request<{}, {}, DeleteManyUsuariosBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;
    const deletedCount = await usuarioService.eliminarUsuariosPorIds(ids);
    res.status(200).json({
      message: 'Borrado múltiple ejecutado',
      requestedCount: ids.length,
      deletedCount
    });
  } catch (error) {
    next(error);
  }
};

export const patchUsuarioVisibility = async (req: Request<{ id: string }, {}, UpdateUsuarioVisibilityBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usuario = await usuarioService.actualizarVisibilidadUsuario(req.params.id, req.body.visible);
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const patchManyUsuariosVisibility = async (req: Request<{}, {}, UpdateManyUsuariosVisibilityBody>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids, visible } = req.body;
    const { matchedCount, modifiedCount } = await usuarioService.actualizarVisibilidadUsuarios(ids, visible);

    res.status(200).json({
      message: 'Visibilidad de usuarios actualizada',
      requestedCount: ids.length,
      matchedCount,
      modifiedCount,
      visible
    });
  } catch (error) {
    next(error);
  }
};
