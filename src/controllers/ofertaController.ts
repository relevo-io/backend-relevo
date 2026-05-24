import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { IOferta } from '../models/ofertaModel.js';
import * as ofertaService from '../services/ofertaService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError } from '../utils/AppError.js';
import { logger } from '../config.js';

const parsePagination = (page?: string, limit?: string) => {
  if (!page && !limit) return null;
  const parsedPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  const parsedLimit = Math.max(1, Number.parseInt(limit ?? '12', 10) || 12);
  return { page: parsedPage, limit: parsedLimit };
};

export const getOfertas = asyncWrapper(
  async (
    req: Request<{}, {}, {}, { excludeOwnerId?: string; search?: string; page?: string; limit?: string }>,
    res: Response
  ): Promise<void> => {
    const pagination = parsePagination(req.query.page, req.query.limit);
    if (pagination) {
      const result = await ofertaService.listarOfertasPaginadas(pagination, {
        excludeOwnerId: req.query.excludeOwnerId,
        search: req.query.search
      });
      res.status(200).json(result);
      return;
    }

    const ofertas = await ofertaService.listarOfertas({
      excludeOwnerId: req.query.excludeOwnerId,
      search: req.query.search
    });
    res.status(200).json(ofertas);
  }
);

export const getOferta = asyncWrapper(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const oferta = await ofertaService.obtenerOfertaPorId(req.params.id);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  res.status(200).json(oferta);
});

export const createOferta = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  logger.info(
    { path: req.originalUrl, userId: req.user?.id, roles: req.user?.roles, body: req.body },
    'CONTROLLER createOferta: entrada'
  );

  if (!req.user) {
    throw new UnauthorizedError('No autenticado');
  }

  const isAdmin = req.user.roles.includes('ADMIN');
  const ownerToSave = isAdmin && req.body.owner ? new Types.ObjectId(req.body.owner) : new Types.ObjectId(req.user.id);

  const nuevaOferta = await ofertaService.crearOferta({
    ...req.body,
    owner: ownerToSave
  });

  logger.info({ ofertaId: nuevaOferta._id, owner: nuevaOferta.owner }, 'CONTROLLER createOferta: guardada');
  res.status(201).json(nuevaOferta);
});

export const updateOferta = asyncWrapper(
  async (req: Request<{ id: string }, {}, Partial<IOferta>>, res: Response): Promise<void> => {
    const authReq = req as unknown as AuthRequest;
    const isAdmin = authReq.user?.roles?.includes('ADMIN');
    const dataToUpdate = { ...req.body };

    if (!isAdmin) {
      delete dataToUpdate.owner;
    }

    const ofertaActualizada = await ofertaService.actualizarOferta(req.params.id, dataToUpdate);
    if (!ofertaActualizada) {
      throw new NotFoundError('Oferta no encontrada');
    }

    res.status(200).json(ofertaActualizada);
  }
);

export const deleteOferta = asyncWrapper(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const eliminada = await ofertaService.eliminarOferta(req.params.id);
  if (!eliminada) {
    throw new NotFoundError('Oferta no encontrada');
  }

  res.status(204).send();
});

export const getMisOfertas = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const page = req.query.page as string | undefined;
  const limit = req.query.limit as string | undefined;
  const pagination = parsePagination(page, limit);

  if (pagination) {
    const result = await ofertaService.obtenerOfertasPorOwnerPaginadas(userId, pagination);
    res.status(200).json(result);
    return;
  }

  const ofertas = await ofertaService.obtenerOfertasPorOwner(userId);
  res.status(200).json(ofertas);
});

export const getMisFavoritas = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const page = req.query.page as string | undefined;
  const limit = req.query.limit as string | undefined;
  const pagination = parsePagination(page, limit);

  if (pagination) {
    const result = await ofertaService.obtenerOfertasFavoritasPaginadas(userId, pagination);
    res.status(200).json(result);
    return;
  }

  const ofertas = await ofertaService.obtenerOfertasFavoritas(userId);
  res.status(200).json(ofertas);
});

export const addOfertaFavorita = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const oferta = await ofertaService.obtenerOfertaPorId(req.params.id);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  await ofertaService.agregarOfertaAFavoritos(userId, req.params.id);
  res.status(200).json({ message: 'Oferta agregada a favoritos' });
});

export const removeOfertaFavorita = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  await ofertaService.quitarOfertaDeFavoritos(userId, req.params.id);
  res.status(200).json({ message: 'Oferta eliminada de favoritos' });
});
