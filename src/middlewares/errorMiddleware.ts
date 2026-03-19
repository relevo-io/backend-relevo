import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config.js';
import { AppError } from '../errors/appError.js';

type DuplicateKeyError = {
  code?: number;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
};

const isDuplicateKeyError = (error: unknown): error is DuplicateKeyError => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const typedError = error as DuplicateKeyError;
  return typedError.code === 11000;
};

const isValidationError = (error: unknown): error is ZodError => {
  return error instanceof ZodError;
};

const buildDuplicateFieldMessage = (error: DuplicateKeyError): string => {
  const duplicatedField = Object.keys(error.keyPattern ?? {})[0];
  const duplicatedValue = duplicatedField ? error.keyValue?.[duplicatedField] : undefined;

  if (!duplicatedField) {
    return 'Conflicto de datos únicos';
  }

  if (duplicatedValue === undefined) {
    return `El campo ${duplicatedField} ya está en uso`;
  }

  return `El campo ${duplicatedField} ya está en uso: ${String(duplicatedValue)}`;
};

export const errorMiddleware: ErrorRequestHandler = (error, req, res, _next) => {
  if (isValidationError(error)) {
    res.status(400).json({
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
    return;
  }

  if (isDuplicateKeyError(error)) {
    logger.warn(error, 'Duplicate key error on %s %s', req.method, req.url);
    res.status(409).json({
      message: buildDuplicateFieldMessage(error),
      code: 'DUPLICATE_KEY'
    });
    return;
  }

  if (error instanceof AppError) {
    const payload: { message: string; code?: string; details?: unknown } = {
      message: error.message
    };

    if (error.code) {
      payload.code = error.code;
    }

    if (error.details !== undefined) {
      payload.details = error.details;
    }

    res.status(error.statusCode).json(payload);
    return;
  }

  logger.error(error, 'Unhandled error on %s %s', req.method, req.url);
  res.status(500).json({ message: 'Internal Server Error' });
};
