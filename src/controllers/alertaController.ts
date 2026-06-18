import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as alertaService from '../services/alertaService.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { UnauthorizedError } from '../utils/AppError.js';

export const createAlert = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    throw new UnauthorizedError('no autenticado');
  }
  const alert = await alertaService.crearAlerta(req.user.id, req.body);
  res.status(201).json(alert);
});

export const getAlerts = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    throw new UnauthorizedError('no autenticado');
  }
  const alerts = await alertaService.obtenerAlertasPorUsuario(req.user.id);
  res.status(200).json(alerts);
});

export const deleteAlert = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.id) {
    throw new UnauthorizedError('no autenticado');
  }
  const { alertaId } = req.params;
  const deleted = await alertaService.eliminarAlerta(req.user.id, alertaId);
  res.status(200).json(deleted);
});
