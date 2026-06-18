import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async Express controllers to automatically catch exceptions
 * and forward them to the global Express error-handling middleware.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asyncWrapper<P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<unknown> | unknown
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
