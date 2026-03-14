import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../config.js';

/**
 * GENERIC VALIDATOR: 
 * Recibe cualquier esquema de Zod y valida el body de la petición.
 */
export const validate = (schema: z.ZodTypeAny) => 
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Intentamos parsear el body con el esquema recibido
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error on %s %s', req.method, req.url);
        
        res.status(400).json({
          message: "Validation failed",
          // Usamos .issues para mapear los errores detallados
          errors: error.issues.map(err => ({
            field: err.path.join('.'), // Une caminos anidados (ej: 'user.name')
            message: err.message
          }))
        });
        return;
      }

      logger.error(error, 'Unexpected validation error');
      res.status(500).json({ message: "Internal server error" });
    }
  };