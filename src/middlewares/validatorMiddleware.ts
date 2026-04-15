import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../config.js';
import { ValidationError } from '../utils/AppError.js';

type ValidationSchemas = {
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
};

/**
 * GENERIC VALIDATOR: 
 * Valida de forma opcional body, params y query.
 */
export const validate = (schemas: ValidationSchemas) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        schemas.body.parse(req.body);
      }

      if (schemas.params) {
        schemas.params.parse(req.params);
      }

      if (schemas.query) {
        schemas.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error on %s %s', req.method, req.url);
        
        const details = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        next(new ValidationError('Validation failed', details));
        return;
      }

      next(error);
    }
  };