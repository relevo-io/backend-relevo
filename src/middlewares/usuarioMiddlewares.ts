import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AuthRequest } from './auth.js';
import { updateUsuarioSchema, updateUsuarioSelfSchema } from '../validators/usuarioValidator.js';
import { ValidationError } from '../utils/AppError.js';

export const validateUsuarioUpdateBody = (req: Request, res: Response, next: NextFunction): void => {
	try {
		const authReq = req as AuthRequest;
		const isAdmin = authReq.user?.roles.includes('ADMIN');
		const schema = isAdmin ? updateUsuarioSchema : updateUsuarioSelfSchema;
		
		// parse throws a ZodError si los datos no encajan, que capturamos abajo
		req.body = schema.parse(req.body);
		next();
	} catch (error) {
		if (error instanceof ZodError) {
			const details = error.issues.map((err: any) => ({ field: err.path.join('.'), message: err.message }));
			next(new ValidationError('Validation failed', details));
			return;
		}
		next(error);
	}
};
