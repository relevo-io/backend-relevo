import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import * as authService from '../services/authService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { UsuarioModel } from '../models/usuarioModel.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { UnauthorizedError, NotFoundError } from '../utils/AppError.js';

export const login = asyncWrapper(async (req: Request, res: Response, _next: NextFunction) => {
  const { email, password } = req.body;

  const usuario = await authService.validateUserCredentials(email, password);

  if (!usuario) {
    throw new UnauthorizedError('Credenciales incorrectas');
  }

  const { accessToken, refreshToken } = authService.getTokens(usuario);

  res.cookie(config.cookies.refreshName, refreshToken, {
    ...config.cookies.options,
    maxAge: config.cookies.maxAge
  });

  res.status(200).json({
    message: 'Login exitoso',
    accessToken,
    usuario: {
      _id: usuario._id,
      fullName: usuario.fullName,
      email: usuario.email,
      roles: usuario.roles,
      language: usuario.language
    }
  });
});

export const refreshToken = asyncWrapper(async (req: Request, res: Response, _next: NextFunction) => {
  const incomingRefreshToken = req.cookies?.[config.cookies.refreshName] || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new UnauthorizedError('Refresh token requerido');
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await authService.refreshUserSession(incomingRefreshToken);

    res.cookie(config.cookies.refreshName, newRefreshToken, {
      ...config.cookies.options,
      maxAge: config.cookies.maxAge
    });

    res.status(200).json({
      message: 'Token refrescado',
      accessToken
    });
  } catch (_error) {
    throw new UnauthorizedError('Refresh token expirado o inválido');
  }
});

export const logout = asyncWrapper(async (req: Request, res: Response, _next: NextFunction) => {
  res.clearCookie(config.cookies.refreshName, {
    ...config.cookies.options
  });

  res.status(200).json({ message: 'Logout exitoso' });
});

export const getMe = asyncWrapper(async (req: AuthRequest, res: Response) => {
  const usuario = await UsuarioModel.findById(req.user?.id).select('-password');
  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }
  res.status(200).json(usuario);
});
