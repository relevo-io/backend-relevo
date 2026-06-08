import { Request, Response } from 'express';
import { IUsuario, INotificationPreferences } from '../models/usuarioModel.js';
import * as usuarioService from '../services/usuarioService.js';
import {
  DeleteManyUsuariosBody,
  UpdateManyUsuariosVisibilityBody,
  UpdateUsuarioVisibilityBody
} from '../validators/usuarioValidator.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError } from '../utils/AppError.js';
import { AuthRequest } from '../middlewares/auth.js';

export const getUsuarios = asyncWrapper(async (_req: Request, res: Response): Promise<void> => {
  const usuarios = await usuarioService.listarUsuarios();
  res.status(200).json(usuarios);
});

export const getUsuario = asyncWrapper(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const usuario = await usuarioService.obtenerUsuarioPorId(req.params.id);
  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(200).json(usuario);
});

export const createUsuario = asyncWrapper(
  async (req: Request<{}, {}, Partial<IUsuario>>, res: Response): Promise<void> => {
    const nuevoUsuario = await usuarioService.crearUsuario({ ...req.body, roles: ['OWNER', 'INTERESTED'] });
    res.status(201).json(nuevoUsuario);
  }
);

export const updateUsuario = asyncWrapper(
  async (req: Request<{ id: string }, {}, Partial<IUsuario>>, res: Response): Promise<void> => {
    const usuarioActualizado = await usuarioService.actualizarUsuario(req.params.id, req.body);
    if (!usuarioActualizado) {
      throw new NotFoundError('Usuario no encontrado');
    }

    res.status(200).json(usuarioActualizado);
  }
);

export const deleteUsuario = asyncWrapper(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const eliminado = await usuarioService.eliminarUsuario(req.params.id);
  if (!eliminado) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(204).send();
});

export const deleteManyUsuarios = asyncWrapper(
  async (req: Request<{}, {}, DeleteManyUsuariosBody>, res: Response): Promise<void> => {
    const { ids } = req.body;
    const deletedCount = await usuarioService.eliminarUsuariosPorIds(ids);
    res.status(200).json({
      message: 'Borrado mÃºltiple ejecutado',
      requestedCount: ids.length,
      deletedCount
    });
  }
);

export const patchUsuarioVisibility = asyncWrapper(
  async (req: Request<{ id: string }, {}, UpdateUsuarioVisibilityBody>, res: Response): Promise<void> => {
    const usuario = await usuarioService.actualizarVisibilidadUsuario(req.params.id, req.body.visible);
    if (!usuario) {
      throw new NotFoundError('Usuario no encontrado');
    }

    res.status(200).json(usuario);
  }
);

export const patchManyUsuariosVisibility = asyncWrapper(
  async (req: Request<{}, {}, UpdateManyUsuariosVisibilityBody>, res: Response): Promise<void> => {
    const { ids, visible } = req.body;
    const { matchedCount, modifiedCount } = await usuarioService.actualizarVisibilidadUsuarios(ids, visible);

    res.status(200).json({
      message: 'Visibilidad de usuarios actualizada',
      requestedCount: ids.length,
      matchedCount,
      modifiedCount,
      visible
    });
  }
);

export const registerFcmToken = asyncWrapper(
  async (req: Request<{}, {}, { token: string }>, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;
    const { token } = req.body;

    await usuarioService.registrarFcmToken(userId, token);
    res.status(200).json({ success: true, message: 'FCM Token registrado correctamente' });
  }
);

export const unregisterFcmToken = asyncWrapper(
  async (req: Request<{ token: string }>, res: Response): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;
    const { token } = req.params;

    await usuarioService.desregistrarFcmToken(userId, token);
    res.status(200).json({ success: true, message: 'FCM Token eliminado correctamente' });
  }
);

export const updateNotificationPreferences = asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const { newMessages, applicationStatus, newApplications, cvAnalysis } = req.body;
  const prefs: INotificationPreferences = {
    newMessages,
    applicationStatus,
    newApplications,
    cvAnalysis
  };

  const updatedUser = await usuarioService.actualizarPreferenciasNotificacion(userId, prefs);

  if (!updatedUser) {
    throw new NotFoundError('Usuario no encontrado');
  }

  res.status(200).json({
    success: true,
    message: 'Preferencias de notificación actualizadas',
    user: updatedUser
  });
});
