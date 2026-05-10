import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async Express controllers to automatically catch exceptions
 * and forward them to the global Express error-handling middleware.
 */
export const asyncWrapper = (fn: Function): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as Request, res, next)).catch(next);
  };
};
