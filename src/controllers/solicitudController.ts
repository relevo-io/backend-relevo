import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ISolicitud } from '../models/solicitudModel.js';
import * as solicitudService from '../services/solicitudService.js';
import * as ofertaService from '../services/ofertaService.js';
import * as chatService from '../services/chatService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { NotFoundError, UnauthorizedError, ValidationError, ForbiddenError, AppError } from '../utils/AppError.js';
import { generarPresignedGet } from '../services/storageService.js';
import { solicitarAnalisisIA } from '../services/aiService.js';
import { logger } from '../config.js';
import { IUsuario, UsuarioModel } from '../models/usuarioModel.js';
import { createNotificationAndSendPush } from '../services/notificationService.js';
import { emitChatUpdated, emitSolicitudDeleted, emitSolicitudUpdated } from '../sockets/realtimeEvents.js';

const parsePagination = (page?: string, limit?: string) => {
  if (!page && !limit) return null;
  const parsedPage = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
  const parsedLimit = Math.max(1, Number.parseInt(limit ?? '10', 10) || 10);
  return { page: parsedPage, limit: parsedLimit };
};

export const getSolicitudes = asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const pagination = parsePagination(req.query.page as string | undefined, req.query.limit as string | undefined);
  if (pagination) {
    const result = await solicitudService.listarSolicitudesPaginadas(pagination);
    res.status(200).json(result);
    return;
  }
  const solicitudes = await solicitudService.listarSolicitudes();
  res.status(200).json(solicitudes);
});

export const getMisSolicitudesOwner = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
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

export const getMisSolicitudesEnviadas = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
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

export const getSolicitud = asyncWrapper(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const solicitud = await solicitudService.obtenerSolicitudPorId(req.params.id);
  if (!solicitud) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  res.status(200).json(solicitud);
});

export const createSolicitud = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    opportunityId,
    message,
    bio,
    professionalBackground,
    preferredRegions,
    availableCapital,
    financingNeeded,
    ndaAccepted
  } = req.body;
  const interestedUserId = req.user?.id;

  if (!interestedUserId) {
    throw new UnauthorizedError('No autenticado');
  }

  const oferta = await ofertaService.obtenerOfertaPorId(opportunityId);
  if (!oferta) {
    throw new NotFoundError('Oferta no encontrada');
  }

  const nueva = await solicitudService.crearSolicitud({
    opportunity: new Types.ObjectId(opportunityId),
    interestedUser: new Types.ObjectId(interestedUserId),
    owner: oferta.owner,
    message,
    bio,
    professionalBackground,
    preferredRegions,
    availableCapital,
    financingNeeded,
    ndaAccepted
  });

  const resultado = await solicitudService.obtenerSolicitudConDetalles(String(nueva._id));

  // Enviar notificación push al propietario de la oferta
  if (resultado) {
    const ownerId = String(resultado.owner);
    const candidate = resultado.interestedUser as unknown as IUsuario;
    const candidateName = candidate?.fullName || 'Un usuario';

    await createNotificationAndSendPush(
      ownerId,
      'Nueva solicitud',
      `${candidateName} te ha solicitado en una oferta`,
      'solicitud',
      {
        click_action: '/mis-solicitudes',
        solicitudId: String(resultado._id)
      },
      'newApplications'
    );

    await emitSolicitudUpdated(String(resultado._id));
  }

  res.status(201).json(resultado);
});

export const updateSolicitud = asyncWrapper(
  async (req: Request<{ id: string }, {}, Partial<ISolicitud>>, res: Response): Promise<void> => {
    const solicitudActualizada = await solicitudService.actualizarSolicitud(req.params.id, req.body);
    if (!solicitudActualizada) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    await emitSolicitudUpdated(req.params.id);

    res.status(200).json(solicitudActualizada);
  }
);

export const deleteSolicitud = asyncWrapper(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const eliminada = await solicitudService.eliminarSolicitud(req.params.id);
  if (!eliminada) {
    throw new NotFoundError('Solicitud no encontrada');
  }

  emitSolicitudDeleted({
    solicitudId: req.params.id,
    opportunityId: String(eliminada.opportunity),
    ownerId: String(eliminada.owner),
    interestedUserId: String(eliminada.interestedUser)
  });

  res.status(204).send();
});

export const patchEstadoSolicitud = asyncWrapper(
  async (req: Request<{ id: string }, {}, Pick<ISolicitud, 'status'>>, res: Response): Promise<void> => {
    // Evitar procesar o notificar por duplicado si el estado ya es el solicitado
    const solicitudPrevia = await solicitudService.obtenerSolicitudPorId(req.params.id);
    if (!solicitudPrevia) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    if (solicitudPrevia.status === req.body.status) {
      res.status(200).json(solicitudPrevia);
      return;
    }

    const solicitudActualizada = await solicitudService.actualizarEstadoSolicitud(req.params.id, req.body.status);
    if (!solicitudActualizada) {
      throw new NotFoundError('Solicitud no encontrada');
    }

    // Enviar notificación push al candidato/interesado informando si fue aceptado o rechazado
    if (req.body.status === 'ACCEPTED' || req.body.status === 'REJECTED') {
      try {
        const solicitudConDetalles = await solicitudService.obtenerSolicitudConDetalles(req.params.id);
        if (solicitudConDetalles) {
          const candidateId = String(solicitudConDetalles.interestedUser._id);
          const ownerId = String(solicitudConDetalles.owner);
          const opportunityId = String(solicitudConDetalles.opportunity._id);

          const owner = await UsuarioModel.findById(ownerId).select('fullName').lean();
          const ownerName = owner?.fullName || 'El propietario';

          const title = req.body.status === 'ACCEPTED' ? 'Solicitud aceptada' : 'Solicitud rechazada';

          const bodyText =
            req.body.status === 'ACCEPTED'
              ? `${ownerName} te ha aceptado la solicitud`
              : `${ownerName} te ha denegado la solicitud`;

          await createNotificationAndSendPush(
            candidateId,
            title,
            bodyText,
            'solicitud',
            {
              click_action: '/mis-solicitudes',
              solicitudId: String(solicitudConDetalles._id),
              status: req.body.status
            },
            'applicationStatus'
          );

          const relatedChat = await chatService.actualizarEstadoChatPorOfertaEInteresado(
            opportunityId,
            candidateId,
            req.body.status === 'ACCEPTED' ? 'APPROVED' : 'REJECTED'
          );

          if (relatedChat?._id) {
            await emitChatUpdated(String(relatedChat._id));
          }
        }
      } catch (err) {
        logger.error(err, 'Error al enviar notificacion push de estado de solicitud');
      }
    }

    await emitSolicitudUpdated(req.params.id);

    res.status(200).json(solicitudActualizada);
  }
);

export const deleteMultiple = asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids)) {
    throw new ValidationError('Se requiere un array de IDs');
  }

  const solicitudes = await Promise.all(ids.map((id) => solicitudService.obtenerSolicitudPorId(id)));
  await solicitudService.eliminarSolicitudesPorIds(ids);

  solicitudes.forEach((solicitud, index) => {
    if (!solicitud) return;
    emitSolicitudDeleted({
      solicitudId: String(ids[index]),
      opportunityId: String(solicitud.opportunity),
      ownerId: String(solicitud.owner),
      interestedUserId: String(solicitud.interestedUser)
    });
  });

  res.status(200).json({ message: 'Solicitudes eliminadas correctamente' });
});

export const getMiSolicitudPorOferta = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
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
export const guardarCvKey = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
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

  await emitSolicitudUpdated(req.params['id']);

  res.status(200).json(updated);
});

/**
 * GET /api/solicitudes/:id/ver-cv
 * Generates a 2-minute pre-signed GET URL for the CV stored in S3.
 * Accessible by the candidate (interestedUser) or the recruiter (owner).
 */
export const verCv = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const solicitud = await solicitudService.obtenerSolicitudPorId(req.params['id']);
  if (!solicitud) throw new NotFoundError('Solicitud no encontrada');

  if (!solicitud.cvKey) {
    throw new NotFoundError('Esta solicitud no tiene un CV adjunto');
  }

  const viewUrl = await generarPresignedGet(solicitud.cvKey);
  res.status(200).json({ viewUrl });
});

/**
 * POST /api/solicitudes/:id/analizar-cv
 * Inicia el proceso de análisis del CV adjunto a la solicitud mediante Inteligencia Artificial.
 * Restringido al propietario del negocio (owner) o un ADMIN.
 */
export const analizarCvConIa = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const userRoles = req.user?.roles || [];
  if (!userId) throw new UnauthorizedError('No autenticado');

  const solicitud = await solicitudService.obtenerSolicitudPorId(req.params['id']);
  if (!solicitud) throw new NotFoundError('Solicitud no encontrada');

  // Seguridad: Solo el dueño de la oferta (owner) o el ADMIN pueden analizar el CV
  const isOwner = String(solicitud.owner) === userId;
  const isAdmin = userRoles.includes('ADMIN');
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('No autorizado para iniciar el análisis de esta solicitud');
  }

  if (!solicitud.cvKey) {
    throw new ValidationError('Esta solicitud no contiene un currículum adjunto');
  }

  // Cambiar estado a EN_PROCESO temporalmente
  await solicitudService.actualizarSolicitud(solicitud._id!.toString(), {
    estadoAnalisis: 'EN_PROCESO'
  });
  await emitSolicitudUpdated(solicitud._id!.toString());

  try {
    // Obtener idioma del usuario que solicita el análisis
    const user = await UsuarioModel.findById(userId).select('language').lean();

    // Solicitar el análisis al microservicio Python
    const resultado = await solicitarAnalisisIA(solicitud.cvKey, user?.language || 'es');

    // Guardar el resultado y completar
    const solicitudActualizada = await solicitudService.actualizarSolicitud(solicitud._id!.toString(), {
      estadoAnalisis: 'COMPLETADO',
      resultadoIa: resultado
    });

    await emitSolicitudUpdated(solicitud._id!.toString());

    // Enviar notificación push al reclutador (el usuario que solicitó el análisis)
    const solicitudConDetalles = await solicitudService.obtenerSolicitudConDetalles(solicitud._id!.toString());
    const candidate = solicitudConDetalles?.interestedUser as unknown as IUsuario;
    const candidateName = candidate?.fullName || 'un candidato';

    await createNotificationAndSendPush(
      userId,
      'Análisis de CV completado',
      `El análisis por IA del CV de ${candidateName} ha finalizado`,
      'cv_analysis',
      {
        click_action: '/mis-solicitudes',
        solicitudId: solicitud._id!.toString()
      },
      'cvAnalysis'
    );

    res.status(200).json(solicitudActualizada);
  } catch (error) {
    // Si falla, actualizar estado a ERROR para dar visibilidad
    await solicitudService.actualizarSolicitud(solicitud._id!.toString(), {
      estadoAnalisis: 'ERROR'
    });

    await emitSolicitudUpdated(solicitud._id!.toString());

    logger.error({ err: error, solicitudId: solicitud._id }, 'Error en el proceso de análisis de IA');

    // Si ya es un AppError, lo relanzamos para que llegue intacto al middleware de errores
    if (error instanceof AppError) {
      throw error;
    }

    const err = error as { message?: string };
    // Lanzamos el error personalizado para que globalErrorHandler lo capture y envíe con el formato unificado
    throw new AppError(
      500,
      'AI_ANALYSIS_FAILED',
      `Fallo al procesar el currículum con Inteligencia Artificial: ${err.message || 'Error desconocido'}`
    );
  }
});
