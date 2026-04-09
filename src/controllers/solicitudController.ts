import { Request, Response } from 'express';
import { logger } from '../config.js';
import { ISolicitud, SolicitudModel } from '../models/solicitudModel.js';
import * as solicitudService from '../services/solicitudService.js';
import { OfertaModel } from '../models/ofertaModel.js';
import { AuthRequest } from '../middlewares/auth.js';

export const getSolicitudes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const solicitudes = await solicitudService.listarSolicitudes();
    res.status(200).json(solicitudes);
  } catch (error) {
    logger.error(error, 'Error obteniendo solicitudes');
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const getSolicitud = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const solicitud = await solicitudService.obtenerSolicitudPorId(req.params.id);
    if (!solicitud) {
      res.status(404).json({ message: 'Solicitud no encontrada' });
      return;
    }

    res.status(200).json(solicitud);
  } catch (error) {
    logger.error(error, 'Error obteniendo solicitud %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const createSolicitud = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { opportunityId, message } = req.body;
    const interestedUserId = req.user?.id;

    if (!interestedUserId) {
      res.status(401).json({ message: 'No autenticado' });
      return;
    }

    const oferta = await OfertaModel.findById(opportunityId);
    if (!oferta) {
      res.status(404).json({ message: 'Oferta no encontrada' });
      return;
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
  } catch (error) {
    logger.error(error, 'Error en createSolicitud');
    res.status(500).json({ message: 'Error interno', error: (error as Error).message });
  }
};

export const updateSolicitud = async (
  req: Request<{ id: string }, {}, Partial<ISolicitud>>,
  res: Response
): Promise<void> => {
  try {
    const solicitudActualizada = await solicitudService.actualizarSolicitud(req.params.id, req.body);
    if (!solicitudActualizada) {
      res.status(404).json({ message: 'Solicitud no encontrada' });
      return;
    }

    res.status(200).json(solicitudActualizada);
  } catch (error) {
    logger.error(error, 'Error actualizando solicitud %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteSolicitud = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const eliminada = await solicitudService.eliminarSolicitud(req.params.id);
    if (!eliminada) {
      res.status(404).json({ message: 'Solicitud no encontrada' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    logger.error(error, 'Error eliminando solicitud %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const patchEstadoSolicitud = async (
  req: Request<{ id: string }, {}, Pick<ISolicitud, 'status'>>,
  res: Response
): Promise<void> => {
  try {
    const solicitudActualizada = await solicitudService.actualizarEstadoSolicitud(req.params.id, req.body.status);
    if (!solicitudActualizada) {
      res.status(404).json({ message: 'Solicitud no encontrada' });
      return;
    }

    res.status(200).json(solicitudActualizada);
  } catch (error) {
    logger.error(error, 'Error actualizando estado de solicitud %s', req.params.id);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const deleteMultiple = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Se requiere un array de IDs' });
    }

    await SolicitudModel.deleteMany({
      _id: { $in: ids }
    });

    res.status(200).json({ message: 'Solicitudes eliminadas correctamente' });
  } catch (error) {
    console.error('Error en deleteMultiple:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
