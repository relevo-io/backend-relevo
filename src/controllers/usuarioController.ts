import { Request, Response } from 'express';
import { logger } from '../config.js';
import { IUsuario } from '../models/usuarioModel.js';
import * as usuarioService from '../services/usuarioService.js';
import {
  DeleteManyUsuariosBody,
  UpdateManyUsuariosVisibilityBody,
  UpdateUsuarioVisibilityBody
} from '../validators/usuarioValidator.js';

export const getUsuarios = async (_req: Request, res: Response): Promise<void> => {
  try {
    const usuarios = await usuarioService.listarUsuarios();
    res.status(200).json(usuarios);
  } catch (error) {
    logger.error(error, 'Error obteniendo usuarios');
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getUsuario = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const usuario = await usuarioService.obtenerUsuarioPorId(req.params.id);
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(usuario);
  } catch (error) {
    logger.error(error, 'Error obteniendo usuario %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createUsuario = async (req: Request<{}, {}, Partial<IUsuario>>, res: Response): Promise<void> => {
  try {
    const nuevoUsuario = await usuarioService.crearUsuario(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    logger.error(error, 'Error creando usuario');
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateUsuario = async (
  req: Request<{ id: string }, {}, Partial<IUsuario>>,
  res: Response
): Promise<void> => {
  try {
    const usuarioActualizado = await usuarioService.actualizarUsuario(req.params.id, req.body);
    if (!usuarioActualizado) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(usuarioActualizado);
  } catch (error) {
    logger.error(error, 'Error actualizando usuario %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteUsuario = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const eliminado = await usuarioService.eliminarUsuario(req.params.id);
    if (!eliminado) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error(error, 'Error eliminando usuario %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteManyUsuarios = async (
  req: Request<{}, {}, DeleteManyUsuariosBody>,
  res: Response
): Promise<void> => {
  try {
    const { ids } = req.body;
    const deletedCount = await usuarioService.eliminarUsuariosPorIds(ids);
    res.status(200).json({
      message: 'Borrado múltiple ejecutado',
      requestedCount: ids.length,
      deletedCount
    });
  } catch (error) {
    logger.error(error, 'Error en borrado múltiple de usuarios');
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const patchUsuarioVisibility = async (
  req: Request<{ id: string }, {}, UpdateUsuarioVisibilityBody>,
  res: Response
): Promise<void> => {
  try {
    const usuario = await usuarioService.actualizarVisibilidadUsuario(req.params.id, req.body.visible);
    if (!usuario) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json(usuario);
  } catch (error) {
    logger.error(error, 'Error actualizando visibilidad de usuario %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const patchManyUsuariosVisibility = async (
  req: Request<{}, {}, UpdateManyUsuariosVisibilityBody>,
  res: Response
): Promise<void> => {
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
    logger.error(error, 'Error actualizando visibilidad múltiple de usuarios');
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
