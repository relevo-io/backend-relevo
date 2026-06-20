import { Request, Response } from 'express';
import { historialService } from '../services/historialService.js';

export const getHistorials = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await historialService.getAll(page, limit, search);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtenir els historials', error });
  }
};

export const getHistorialById = async (req: Request, res: Response) => {
  try {
    const historial = await historialService.getById(req.params.id);
    if (!historial) return res.status(404).json({ message: 'Historial no trobat' });

    res.status(200).json(historial);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtenir el historial', error });
  }
};

export const deleteHistorial = async (req: Request, res: Response) => {
  try {
    const deleted = await historialService.delete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Historial no trobat per esborrar' });

    res.status(200).json({ message: 'Historial esborrat correctament' });
  } catch (error) {
    res.status(500).json({ message: 'Error al esborrar el historial', error });
  }
};
