import { Request, Response } from 'express';
import { IOferta } from '../models/ofertaModel.js';
import * as ofertaService from '../services/ofertaService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError } from '../utils/AppError.js';
import { logger } from '../config.js';

export const getOfertas = asyncWrapper(async (req: Request<{}, {}, {}, { excludeOwnerId?: string }>, res: Response) => {
  const ofertas = await ofertaService.listarOfertas({
    excludeOwnerId: req.query.excludeOwnerId
  });
  res.status(200).json(ofertas);
});

export const getOferta = asyncWrapper(async (req: Request<{ id: string }>, res: Response) => {
  const oferta = await ofertaService.obtenerOfertaPorId(req.params.id);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  res.status(200).json(oferta);
});

export const createOferta = asyncWrapper(async (req: AuthRequest, res: Response) => {
  logger.info({ path: req.originalUrl, userId: req.user?.id, roles: req.user?.roles, body: req.body }, 'CONTROLLER createOferta: entrada');

  if (!req.user) {
    throw new UnauthorizedError('No autenticado');
  }

  const isAdmin = req.user.roles.includes('ADMIN');
  const ownerToSave = (isAdmin && req.body.owner) ? req.body.owner : req.user.id;

  const nuevaOferta = await ofertaService.crearOferta({
    ...req.body,
    owner: ownerToSave as any
  });

  logger.info({ ofertaId: nuevaOferta._id, owner: nuevaOferta.owner }, 'CONTROLLER createOferta: guardada');
  res.status(201).json(nuevaOferta);
});

export const updateOferta = asyncWrapper(async (
  req: Request<{ id: string }, {}, Partial<IOferta>>,
  res: Response
) => {
  const authReq = req as unknown as AuthRequest;
  const isAdmin = authReq.user?.roles?.includes('ADMIN');
  let dataToUpdate = { ...req.body } as any;

  if (!isAdmin) {
    delete dataToUpdate.owner;
  }

  const ofertaActualizada = await ofertaService.actualizarOferta(req.params.id, dataToUpdate);
  if (!ofertaActualizada) {
    throw new NotFoundError('Oferta no encontrada');
  }

  res.status(200).json(ofertaActualizada);
});

export const deleteOferta = asyncWrapper(async (req: Request<{ id: string }>, res: Response) => {
  const eliminada = await ofertaService.eliminarOferta(req.params.id);
  if (!eliminada) {
    throw new NotFoundError('Oferta no encontrada');
  }

  res.status(204).send();
});

export const getMisOfertas = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const ofertas = await ofertaService.obtenerOfertasPorOwner(userId);
  res.status(200).json(ofertas);
});
