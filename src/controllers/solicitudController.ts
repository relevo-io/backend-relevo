import { Request, Response } from 'express';
import { logger } from '../config.js';
import { ISolicitud } from '../models/solicitudModel.js';
import * as solicitudService from '../services/solicitudService.js';
import { DeleteManySolicitudesBody } from '../validators/solicitudValidator.js';

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

export const createSolicitud = async (
  req: Request<{}, {}, Partial<ISolicitud>>,
  res: Response
): Promise<void> => {
  try {
    const nuevaSolicitud = await solicitudService.crearSolicitud(req.body);
    res.status(201).json(nuevaSolicitud);
  } catch (error) {
    logger.error(error, 'Error creando solicitud');
    res.status(500).json({ message: 'Internal Server Error' });
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

export const deleteMultiple = async (
  req: Request<{}, {}, DeleteManySolicitudesBody>,
  res: Response
): Promise<void> => {
  try {

    const deletedCount = await solicitudService.eliminarSolicitudesPorIds(req.body.ids);

    res.status(200).json({
      message: 'Borrado multiple ejecutado',
      requestedCount: req.body.ids.length,
      deletedCount
    });
  } catch (error) {
    logger.error(error, 'Error en borrado multiple de solicitudes');
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

