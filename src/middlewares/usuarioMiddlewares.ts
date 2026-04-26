import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from './auth.js';
import { updateUsuarioSchema, updateUsuarioSelfSchema } from '../validators/usuarioValidator.js';
import { ValidationError } from '../utils/AppError.js';
import { logger } from '../config.js';

export const validateUsuarioUpdateBody = (req: Request, res: Response, next: NextFunction): void => {
	try {
		const authReq = req as AuthRequest;
		const isAdmin = authReq.user?.roles.includes('ADMIN');
		const schema = isAdmin ? updateUsuarioSchema : updateUsuarioSelfSchema;

		logger.info(
			{
				method: req.method,
				path: req.originalUrl,
				userId: authReq.user?.id,
				isAdmin,
				body: req.body
			},
			'USUARIO UPDATE VALIDATOR: entrada'
		);
		
		// parse throws a ZodError si los datos no encajan, que capturamos abajo
		req.body = schema.parse(req.body);
		logger.info({ method: req.method, path: req.originalUrl, parsedBody: req.body }, 'USUARIO UPDATE VALIDATOR: OK');
		next();
	} catch (error) {
		if (error instanceof ZodError) {
			logger.warn(
				{
					method: req.method,
					path: req.originalUrl,
					body: req.body,
					issues: error.issues.map((issue) => ({
						path: issue.path.join('.'),
						message: issue.message,
						code: issue.code
					}))
				},
				'USUARIO UPDATE VALIDATOR: ZodError'
			);

			const details = error.issues.map((err: any) => ({ field: err.path.join('.'), message: err.message }));
			next(new ValidationError('Validation failed', details));
			return;
		}
		next(error);
	}
};
