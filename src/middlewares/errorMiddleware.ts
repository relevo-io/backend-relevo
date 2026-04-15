import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config.js';

export interface ApiErrorResponse {
  success: boolean;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: { field?: string; message: string; }[];
  timestamp: string;
}

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let errorToHandle = err;

  // Interceptar errores específicos de Mongoose / MongoDB
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    errorToHandle = new AppError(
      409,
      'CONFLICT',
      `Ya existe un registro con ese ${field}. Por favor, utiliza otro.`,
      [{ field, message: 'Dato duplicado' }]
    );
  }

  // Configuro respuesta estándar estrictamente tipada
  const response: ApiErrorResponse = {
    success: false,
    statusCode: errorToHandle.statusCode || 500,
    errorCode: errorToHandle.errorCode || 'INTERNAL_ERROR',
    message: errorToHandle.message || 'Error interno del servidor',
    details: errorToHandle.details,
    timestamp: new Date().toISOString()
  };

  // Manejo de errores controlados (Operacionales)
  if (errorToHandle instanceof AppError && errorToHandle.isOperational) {
    if (errorToHandle.statusCode >= 500) {
       logger.error(errorToHandle, 'AppError (Operational 500)');
    } else {
       logger.warn(`[${errorToHandle.errorCode}] ${errorToHandle.message}`);
    }
  } else {
    // Error NO controlado. Bug de programación interno o librerías que petan
    logger.error(err, 'Unhandled Exception (Programming Error)');
    response.statusCode = 500;
    response.errorCode = 'INTERNAL_ERROR';
    // Opcionalmente en producción no desvelaremos detalles
    response.message = 'Ha ocurrido un error inesperado en el servidor.';
    response.details = undefined;
  }

  res.status(response.statusCode).json(response);
};
