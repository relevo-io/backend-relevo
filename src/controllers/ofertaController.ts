import { Request, Response } from 'express';
import { IOferta } from '../models/ofertaModel.js';
import * as ofertaService from '../services/ofertaService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError } from '../utils/AppError.js';

export const getOfertas = asyncWrapper(async (_req: Request, res: Response) => {
  const ofertas = await ofertaService.listarOfertas();
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
  if (!req.user) {
    throw new UnauthorizedError('No autenticado');
  }

  const nuevaOferta = await ofertaService.crearOferta({
    ...req.body,
    owner: req.user.id as any
  });
  res.status(201).json(nuevaOferta);
});

export const updateOferta = asyncWrapper(async (
  req: Request<{ id: string }, {}, Partial<IOferta>>,
  res: Response
) => {
  const { owner, ...safeData } = req.body as any;
  const ofertaActualizada = await ofertaService.actualizarOferta(req.params.id, safeData);
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
