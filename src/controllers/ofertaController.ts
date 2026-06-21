import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { IOferta, OfertaModel } from '../models/ofertaModel.js';
import * as ofertaService from '../services/ofertaService.js';
import * as usuarioService from '../services/usuarioService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/AppError.js';
import { logger } from '../config.js';

const parsePagination = (page?: string, limit?: string) => {
  if (!page && !limit) return null;
  const parsedPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  const parsedLimit = Math.max(1, Number.parseInt(limit ?? '12', 10) || 12);
  return { page: parsedPage, limit: parsedLimit };
};

const extractOwnerId = (owner: unknown): string => {
  if (typeof owner === 'object' && owner !== null && '_id' in owner) {
    return String((owner as { _id: unknown })._id);
  }

  return String(owner);
};

export const getOfertas = asyncWrapper(
  async (
    req: AuthRequest &
      Request<
        {},
        {},
        {},
        {
          excludeOwnerId?: string;
          search?: string;
          sector?: string;
          region?: string;
          revenueRange?: string;
          employeeRange?: string;
          creationYearFrom?: string;
          creationYearTo?: string;
          page?: string;
          limit?: string;
        }
      >,
    res: Response
  ): Promise<void> => {
    const pagination = parsePagination(req.query.page, req.query.limit);
    const isAdmin = req.user?.roles.includes('ADMIN') ?? false;
    const filters = {
      excludeOwnerId: req.user && !isAdmin ? req.user.id : req.query.excludeOwnerId,
      search: req.query.search,
      sector: req.query.sector,
      region: req.query.region,
      revenueRange: req.query.revenueRange,
      employeeRange: req.query.employeeRange,
      creationYearFrom: req.query.creationYearFrom ? Number.parseInt(req.query.creationYearFrom, 10) : undefined,
      creationYearTo: req.query.creationYearTo ? Number.parseInt(req.query.creationYearTo, 10) : undefined,
      viewerId: req.user?.id
    };
    if (pagination) {
      const result = await ofertaService.listarOfertasPaginadas(pagination, filters);
      res.status(200).json(result);
      return;
    }

    const ofertas = await ofertaService.listarOfertas(filters);
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

export const registerOfertaView = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const oferta = await ofertaService.registrarVistaOferta(req.params.id, req.user);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  res.status(200).json({ detailViewCount: oferta.detailViewCount ?? 0 });
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
  if (!isAdmin) {
    await usuarioService.consumirCreditoPublicacion(req.user.id);
  }
  const ownerToSave = isAdmin && req.body.owner ? new Types.ObjectId(req.body.owner) : new Types.ObjectId(req.user.id);

  const nuevaOferta = await ofertaService.crearOferta({
    ...req.body,
    owner: ownerToSave
  });

  logger.info({ ofertaId: nuevaOferta._id, owner: nuevaOferta.owner }, 'CONTROLLER createOferta: guardada');
  res.status(201).json(nuevaOferta);
});

export const purchasePublicationCredit = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const usuario = await usuarioService.otorgarCreditoPublicacion(userId);
  res.status(200).json({
    publicationCredits: usuario.publicationCredits ?? 0
  });
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

export const getOfertaAnalytics = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const oferta = await ofertaService.obtenerOfertaPorId(req.params.id);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  const isAdmin = req.user?.roles.includes('ADMIN');
  const ownerId = extractOwnerId(oferta.owner);
  if (!isAdmin && ownerId !== userId) {
    throw new ForbiddenError('No autorizado');
  }

  const analytics = await ofertaService.obtenerAnalyticsOferta(req.params.id);
  res.status(200).json(analytics);
});

export const getMisOfertasAnalyticsSummary = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const summary = await ofertaService.obtenerAnalyticsResumenOwner(userId);
  res.status(200).json(summary);
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
  const favoriteCount = await ofertaService.contarFavoritosOferta(req.params.id);
  res.status(200).json({ message: 'Oferta agregada a favoritos', favoriteCount });
});

export const removeOfertaFavorita = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  await ofertaService.quitarOfertaDeFavoritos(userId, req.params.id);
  const favoriteCount = await ofertaService.contarFavoritosOferta(req.params.id);
  res.status(200).json({ message: 'Oferta eliminada de favoritos', favoriteCount });
});

export const getOfertasPorSectorGrafana = asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const stats = await OfertaModel.aggregate([
    {
      $group: {
        _id: '$sector',
        total: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        sector: '$_id',
        total: 1
      }
    }
  ]);

  res.status(200).json(stats);
});

export const getOfertasPorRevenueGrafana = asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const stats = await OfertaModel.aggregate([
    {
      $group: {
        _id: '$revenueRange',
        total: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        revenueRange: { $ifNull: ['$_id', 'NOT_SPECIFIED'] }, // Por si alguna oferta no tiene el campo requerido
        total: 1
      }
    }
  ]);

  res.status(200).json(stats);
});
