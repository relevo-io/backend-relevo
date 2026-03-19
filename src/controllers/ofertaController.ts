import { NextFunction, Request, Response } from 'express';
import { IOferta } from '../models/ofertaModel.js';
import * as ofertaService from '../services/ofertaService.js';

export const getOfertas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ofertas = await ofertaService.listarOfertas();
    res.status(200).json(ofertas);
  } catch (error) {
    next(error);
  }
};

export const getOferta = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const oferta = await ofertaService.obtenerOfertaPorId(req.params.id);
    if (!oferta) {
      res.status(404).json({ message: 'Oferta no encontrada' });
      return;
    }

    res.status(200).json(oferta);
  } catch (error) {
    next(error);
  }
};

export const createOferta = async (req: Request<{}, {}, Partial<IOferta>>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const nuevaOferta = await ofertaService.crearOferta(req.body);
    res.status(201).json(nuevaOferta);
  } catch (error) {
    next(error);
  }
};

export const updateOferta = async (req: Request<{ id: string }, {}, Partial<IOferta>>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ofertaActualizada = await ofertaService.actualizarOferta(req.params.id, req.body);
    if (!ofertaActualizada) {
      res.status(404).json({ message: 'Oferta no encontrada' });
      return;
    }

    res.status(200).json(ofertaActualizada);
  } catch (error) {
    next(error);
  }
};

export const deleteOferta = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const eliminada = await ofertaService.eliminarOferta(req.params.id);
    if (!eliminada) {
      res.status(404).json({ message: 'Oferta no encontrada' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
