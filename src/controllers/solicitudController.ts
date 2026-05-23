import { Request, Response } from 'express';
import { ISolicitud } from '../models/solicitudModel.js';
import * as solicitudService from '../services/solicitudService.js';
import * as ofertaService from '../services/ofertaService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError, ValidationError, ForbiddenError } from '../utils/AppError.js';
import { generarPresignedGet } from '../services/storageService.js';

const parsePagination = (page?: string, limit?: string) => {
  if (!page && !limit) return null;
  const parsedPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  const parsedLimit = Math.max(1, Number.parseInt(limit ?? '10', 10) || 10);
  return { page: parsedPage, limit: parsedLimit };
};

export const getSolicitudes = asyncWrapper(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query.page as string | undefined, req.query.limit as string | undefined);
  if (pagination) {
    const result = await solicitudService.listarSolicitudesPaginadas(pagination);
    res.status(200).json(result);
    return;
  }

  const solicitudes = await solicitudService.listarSolicitudes();
  res.status(200).json(solicitudes);
});

export const getMisSolicitudesOwner = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const ownerId = req.user?.id;
  if (!ownerId) {
    throw new UnauthorizedError('No autenticado');
  }

  const pagination = parsePagination(req.query.page as string | undefined, req.query.limit as string | undefined);
  if (pagination) {
    const result = await solicitudService.obtenerSolicitudesPorPropietarioPaginadas(ownerId, pagination);
    res.status(200).json(result);
    return;
  }

  const solicitudes = await solicitudService.obtenerSolicitudesPorPropietario(ownerId);
  res.status(200).json(solicitudes);
});

export const getMisSolicitudesEnviadas = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const pagination = parsePagination(req.query.page as string | undefined, req.query.limit as string | undefined);
  if (pagination) {
    const result = await solicitudService.obtenerSolicitudesPorInteresadoPaginadas(userId, pagination);
    res.status(200).json(result);
    return;
  }

  const solicitudes = await solicitudService.obtenerSolicitudesPorInteresado(userId);
  res.status(200).json(solicitudes);
});

export const getSolicitud = asyncWrapper(async (req: Request<{ id: string }>, res: Response) => {
  const solicitud = await solicitudService.obtenerSolicitudPorId(req.params.id);
  if (!solicitud) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  res.status(200).json(solicitud);
});

export const createSolicitud = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const { opportunityId, message } = req.body;
  const interestedUserId = req.user?.id;

  if (!interestedUserId) {
    throw new UnauthorizedError('No autenticado');
  }

  const oferta = await ofertaService.obtenerOfertaPorId(opportunityId);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  const nueva = await solicitudService.crearSolicitud({
    opportunity: opportunityId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interestedUser: interestedUserId as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    owner: oferta.owner as any,
    message
  });

  const resultado = await solicitudService.obtenerSolicitudConDetalles(String(nueva._id));

  res.status(201).json(resultado);
});

export const updateSolicitud = asyncWrapper(
  async (req: Request<{ id: string }, {}, Partial<ISolicitud>>, res: Response) => {
    const solicitudActualizada = await solicitudService.actualizarSolicitud(req.params.id, req.body);
    if (!solicitudActualizada) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    res.status(200).json(solicitudActualizada);
  }
);

export const deleteSolicitud = asyncWrapper(async (req: Request<{ id: string }>, res: Response) => {
  const eliminada = await solicitudService.eliminarSolicitud(req.params.id);
  if (!eliminada) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  res.status(204).send();
});

export const patchEstadoSolicitud = asyncWrapper(
  async (req: Request<{ id: string }, {}, Pick<ISolicitud, 'status'>>, res: Response) => {
    const solicitudActualizada = await solicitudService.actualizarEstadoSolicitud(req.params.id, req.body.status);
    if (!solicitudActualizada) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    res.status(200).json(solicitudActualizada);
  }
);

export const deleteMultiple = asyncWrapper(async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    throw new ValidationError('Se requiere un array de IDs');
  }

  await solicitudService.eliminarSolicitudesPorIds(ids);

  res.status(200).json({ message: 'Solicitudes eliminadas correctamente' });
});

export const getMiSolicitudPorOferta = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { ofertaId } = req.params;

  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const solicitud = await solicitudService.obtenerSolicitudPorOfertaYUsuario(ofertaId, userId);

  res.status(200).json(solicitud);
});

/**
 * PATCH /api/solicitudes/:id/guardar-cv
 * Saves the S3 key of the CV after the client has uploaded it directly to S3.
 * Only the interestedUser (candidate) of this solicitud can call this endpoint.
 */
export const guardarCvKey = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new UnauthorizedError('No autenticado');

  const { cvKey } = req.body;

  const solicitud = await solicitudService.obtenerSolicitudPorId(req.params['id']);
  if (!solicitud) throw new NotFoundError('Solicitud no encontrada');

  // Only the candidate (interestedUser) can attach their own CV
  if (String(solicitud.interestedUser) !== userId && !req.user?.roles.includes('ADMIN')) {
    throw new ForbiddenError('No autorizado para modificar esta solicitud');
  }

  const updated = await solicitudService.actualizarSolicitud(req.params['id'], { cvKey });

  res.status(200).json(updated);
});

/**
 * GET /api/solicitudes/:id/ver-cv
 * Generates a 2-minute pre-signed GET URL for the CV stored in S3.
 * Accessible by the candidate (interestedUser) or the recruiter (owner).
 */
export const verCv = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const solicitud = await solicitudService.obtenerSolicitudPorId(req.params['id']);
  if (!solicitud) throw new NotFoundError('Solicitud no encontrada');

  if (!solicitud.cvKey) {
    throw new NotFoundError('Esta solicitud no tiene un CV adjunto');
  }

  const viewUrl = await generarPresignedGet(solicitud.cvKey);
  res.status(200).json({ viewUrl });
});
