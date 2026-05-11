import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt.js';
import { IJwtPayload } from '../models/JwtPayload.js';
import { OfertaModel } from '../models/ofertaModel.js';
import { SolicitudModel } from '../models/solicitudModel.js';
import { ChatModel } from '../models/chatModel.js';
import { UnauthorizedError, ForbiddenError, NotFoundError, InternalServerError } from '../utils/AppError.js';

export interface AuthRequest extends Request {
  user?: IJwtPayload;
}

const hasRole = (req: AuthRequest, role: 'OWNER' | 'INTERESTED' | 'ADMIN'): boolean => {
  return !!req.user?.roles?.includes(role);
};

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Token requerido'));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Access token expirado'));
    }

    return next(new UnauthorizedError('Token inválido'));
  }
};

export const authorizeRoles = (..._allowedRoles: Array<'OWNER' | 'INTERESTED' | 'ADMIN'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    // BYPASS TEMPORAL PER A LA DEMO:
    // Permet que qualsevol usuari registrat passi el control de rols.
    next();

    /* CODI ORIGINAL (desactivat temporalment per a la demo):
    const isAllowed = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!isAllowed) {
      return next(new ForbiddenError('No autorizado por rol'));
    }

    next();
    */
  };
};

export const authorizeSelfOrAdmin = (paramName: string = 'id') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    const isAdmin = hasRole(req, 'ADMIN');
    const isSelf = req.user.id === req.params[paramName];

    if (!isAdmin && !isSelf) {
      return next(new ForbiddenError('No autorizado'));
    }

    next();
  };
};

export const authorizeOfertaOwnerOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    if (hasRole(req, 'ADMIN')) {
      return next();
    }

    const oferta = await OfertaModel.findById(req.params.id).select('owner').lean();
    if (!oferta) {
      return next(new NotFoundError('Oferta no encontrada'));
    }

    if (String(oferta.owner) !== req.user.id) {
      return next(new ForbiddenError('No autorizado'));
    }

    next();
  } catch (_error) {
    return next(new InternalServerError('Internal Server Error'));
  }
};

export const authorizeSolicitudOwnerOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    if (hasRole(req, 'ADMIN')) {
      return next();
    }

    const solicitud = await SolicitudModel.findById(req.params.id).select('owner').lean();
    if (!solicitud) {
      return next(new NotFoundError('Solicitud no encontrada'));
    }

    if (String(solicitud.owner) !== req.user.id) {
      return next(new ForbiddenError('No autorizado'));
    }

    next();
  } catch (_error) {
    return next(new InternalServerError('Internal Server Error'));
  }
};

export const authorizeSolicitudParticipantOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    if (hasRole(req, 'ADMIN')) {
      return next();
    }

    const solicitud = await SolicitudModel.findById(req.params.id).select('owner interestedUser').lean();
    if (!solicitud) {
      return next(new NotFoundError('Solicitud no encontrada'));
    }

    const isOwner = String(solicitud.owner) === req.user.id;
    const isInterested = String(solicitud.interestedUser) === req.user.id;

    if (!isOwner && !isInterested) {
      return next(new ForbiddenError('No autorizado'));
    }

    next();
  } catch (_error) {
    return next(new InternalServerError('Internal Server Error'));
  }
};

export const authorizeChatParticipant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    if (req.user.roles.includes('ADMIN')) {
      return next();
    }

    const chat = await ChatModel.findById(req.params['chatId']).select('owner interested').lean();
    if (!chat) {
      return next(new NotFoundError('Chat no encontrado'));
    }

    const isOwner = String(chat.owner) === req.user.id;
    const isInterested = String(chat.interested) === req.user.id;

    if (!isOwner && !isInterested) {
      return next(new ForbiddenError('No autorizado para acceder a este chat'));
    }

    next();
  } catch (_error) {
    return next(new InternalServerError('Internal Server Error'));
  }
};
