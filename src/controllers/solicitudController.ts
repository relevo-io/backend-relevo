import { Request, Response } from 'express';
import { ISolicitud, SolicitudModel } from '../models/solicitudModel.js';
import * as solicitudService from '../services/solicitudService.js';
import { OfertaModel } from '../models/ofertaModel.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/AppError.js';

export const getSolicitudes = asyncWrapper(async (_req: Request, res: Response) => {
  const solicitudes = await solicitudService.listarSolicitudes();
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

  const oferta = await OfertaModel.findById(opportunityId);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  const nueva = await solicitudService.crearSolicitud({
    opportunity: opportunityId,
    interestedUser: interestedUserId,
    owner: oferta.owner,
    message
  } as any);

  const resultado = await SolicitudModel.findById(nueva._id)
    .populate('opportunity')
    .populate('interestedUser')
    .lean();

  res.status(201).json(resultado);
});

export const updateSolicitud = asyncWrapper(async (
  req: Request<{ id: string }, {}, Partial<ISolicitud>>,
  res: Response
) => {
  const solicitudActualizada = await solicitudService.actualizarSolicitud(req.params.id, req.body);
  if (!solicitudActualizada) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  res.status(200).json(solicitudActualizada);
});

export const deleteSolicitud = asyncWrapper(async (req: Request<{ id: string }>, res: Response) => {
  const eliminada = await solicitudService.eliminarSolicitud(req.params.id);
  if (!eliminada) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  res.status(204).send();
});

export const patchEstadoSolicitud = asyncWrapper(async (
  req: Request<{ id: string }, {}, Pick<ISolicitud, 'status'>>,
  res: Response
) => {
  const solicitudActualizada = await solicitudService.actualizarEstadoSolicitud(req.params.id, req.body.status);
  if (!solicitudActualizada) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  res.status(200).json(solicitudActualizada);
});

export const deleteMultiple = asyncWrapper(async (req: Request, res: Response) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    throw new ValidationError('Se requiere un array de IDs');
  }

  await SolicitudModel.deleteMany({
    _id: { $in: ids }
  });

  res.status(200).json({ message: 'Solicitudes eliminadas correctamente' });
});

export const getMisSolicitudes = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  // Buscamos las solicitudes donde el usuario logueado es el PROPIETARIO (owner)
  const misSolicitudes = await SolicitudModel.find({ owner: userId })
    .populate('interestedUser', 'nombre email') 
    .populate('opportunity', 'companyDescription')
    .sort({ createdAt: -1 }) // Las más recientes primero
    .lean()
    .exec();

  res.status(200).json(misSolicitudes);
});