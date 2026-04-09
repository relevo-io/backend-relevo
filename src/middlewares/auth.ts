import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../utils/jwt.js";
import { IJwtPayload } from "../models/JwtPayload.js";
import { OfertaModel } from "../models/ofertaModel.js";
import { SolicitudModel } from "../models/solicitudModel.js";

export interface AuthRequest extends Request {
  user?: IJwtPayload;
}

const hasRole = (req: AuthRequest, role: 'OWNER' | 'INTERESTED' | 'ADMIN'): boolean => {
  return !!req.user?.roles?.includes(role);
};

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Access token expirado" });
    }

    return res.status(401).json({ message: "Token inválido" });
  }
};

export const authorizeRoles = (...allowedRoles: Array<'OWNER' | 'INTERESTED' | 'ADMIN'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const isAllowed = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!isAllowed) {
      return res.status(403).json({ message: 'No autorizado por rol' });
    }

    next();
  };
};

export const authorizeSelfOrAdmin = (paramName: string = 'id') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const isAdmin = hasRole(req, 'ADMIN');
    const isSelf = req.user.id === req.params[paramName];

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    next();
  };
};

export const authorizeOfertaOwnerOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (hasRole(req, 'ADMIN')) {
      return next();
    }

    const oferta = await OfertaModel.findById(req.params.id).select('owner').lean();
    if (!oferta) {
      return res.status(404).json({ message: 'Oferta no encontrada' });
    }

    if (String(oferta.owner) !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const authorizeSolicitudOwnerOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (hasRole(req, 'ADMIN')) {
      return next();
    }

    const solicitud = await SolicitudModel.findById(req.params.id).select('owner').lean();
    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    if (String(solicitud.owner) !== req.user.id) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const authorizeSolicitudParticipantOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (hasRole(req, 'ADMIN')) {
      return next();
    }

    const solicitud = await SolicitudModel.findById(req.params.id).select('owner interestedUser').lean();
    if (!solicitud) {
      return res.status(404).json({ message: 'Solicitud no encontrada' });
    }

    const isOwner = String(solicitud.owner) === req.user.id;
    const isInterested = String(solicitud.interestedUser) === req.user.id;

    if (!isOwner && !isInterested) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
