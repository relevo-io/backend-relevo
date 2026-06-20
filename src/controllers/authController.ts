import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import * as authService from '../services/authService.js';
import { AuthRequest } from '../middlewares/auth.js';
import * as usuarioService from '../services/usuarioService.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { UnauthorizedError, NotFoundError, ValidationError } from '../utils/AppError.js';

const serializeAuthUser = (usuario: {
  _id?: unknown;
  fullName?: string;
  email?: string;
  roles?: string[];
  language?: string;
  theme?: string;
  authProvider?: string;
  notificationPreferences?: unknown;
  preferredRegions?: string[];
  preferredSectors?: string[];
  preferredEmployeeRanges?: string[];
  preferredRevenueRanges?: string[];
  preferredCreationYearFrom?: number;
  preferredCreationYearTo?: number;
  publicationCredits?: number;
  proExpiresAt?: Date | null;
  proActive?: boolean;
}) => {
  const proExpiresAt = usuario.proExpiresAt ?? null;
  const proActive = usuario.proActive ?? (proExpiresAt ? new Date(proExpiresAt).getTime() > Date.now() : false);

  return {
    _id: usuario._id,
    fullName: usuario.fullName,
    email: usuario.email,
    roles: usuario.roles,
    language: usuario.language,
    theme: usuario.theme,
    authProvider: usuario.authProvider,
    notificationPreferences: usuario.notificationPreferences,
    preferredRegions: usuario.preferredRegions,
    preferredSectors: usuario.preferredSectors,
    preferredEmployeeRanges: usuario.preferredEmployeeRanges,
    preferredRevenueRanges: usuario.preferredRevenueRanges,
    preferredCreationYearFrom: usuario.preferredCreationYearFrom,
    preferredCreationYearTo: usuario.preferredCreationYearTo,
    publicationCredits: usuario.publicationCredits ?? 0,
    proExpiresAt,
    proActive
  };
};

export const login = asyncWrapper(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const { email, password } = req.body;

  const usuario = await authService.validateUserCredentials(email, password);

  if (!usuario) {
    throw new UnauthorizedError('ERRORS.AUTH.INVALID_CREDENTIALS');
  }

  const { accessToken, refreshToken } = authService.getTokens(usuario);

  res.cookie(config.cookies.refreshName, refreshToken, {
    ...config.cookies.options,
    maxAge: config.cookies.maxAge
  });

  res.status(200).json({
    message: 'Login exitoso',
    accessToken,
    usuario: serializeAuthUser(usuario)
  });
});

export const refreshToken = asyncWrapper(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  const incomingRefreshToken = req.cookies?.[config.cookies.refreshName] || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new UnauthorizedError('ERRORS.AUTH.REFRESH_TOKEN_REQUIRED');
  }

  try {
    const {
      accessToken,
      refreshToken: newRefreshToken,
      usuario
    } = await authService.refreshUserSession(incomingRefreshToken);

    res.cookie(config.cookies.refreshName, newRefreshToken, {
      ...config.cookies.options,
      maxAge: config.cookies.maxAge
    });

    res.status(200).json({
      message: 'Token refrescado',
      accessToken,
      usuario: serializeAuthUser(usuario)
    });
  } catch (_error) {
    throw new UnauthorizedError('ERRORS.AUTH.REFRESH_TOKEN_INVALID');
  }
});

export const logout = asyncWrapper(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  res.clearCookie(config.cookies.refreshName, {
    ...config.cookies.options
  });

  res.status(200).json({ message: 'Logout exitoso' });
});

export const getMe = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const usuario = await usuarioService.obtenerUsuarioPorId(String(req.user?.id));
  if (!usuario) {
    throw new NotFoundError('Usuario no encontrado');
  }
  res.status(200).json(usuario);
});

export const firebaseLogin = asyncWrapper(async (req: Request, res: Response) => {
  const { idToken, providerAccessToken } = req.body as { idToken?: string; providerAccessToken?: string };

  if (!idToken) {
    throw new UnauthorizedError('idToken requerido');
  }

  const { accessToken, refreshToken, usuario, isNewUser } = await authService.loginWithFirebaseToken(
    idToken,
    providerAccessToken
  );

  res.cookie(config.cookies.refreshName, refreshToken, {
    ...config.cookies.options,
    maxAge: config.cookies.maxAge
  });

  res.status(200).json({
    message: 'Login Firebase exitoso',
    accessToken,
    isNewUser,
    usuario: serializeAuthUser(usuario)
  });
});

export const getGitHubAuthorizeUrl = asyncWrapper(async (req: Request, res: Response) => {
  const { redirectUri, state } = req.body as { redirectUri?: string; state?: string };

  if (!redirectUri || !state) {
    throw new ValidationError('redirectUri y state son requeridos');
  }

  const authorizeUrl = authService.getGitHubAuthorizeUrl(redirectUri, state);
  res.status(200).json({ authorizeUrl });
});

export const oauthLogin = asyncWrapper(async (req: Request, res: Response) => {
  const provider = req.params.provider;
  const { code, redirectUri } = req.body as { code?: string; redirectUri?: string };

  if (provider !== 'github') {
    throw new ValidationError('Proveedor OAuth no soportado');
  }

  if (!code || !redirectUri) {
    throw new ValidationError('code y redirectUri son requeridos');
  }

  const { accessToken, refreshToken, usuario, isNewUser } = await authService.loginWithGitHubCode(code, redirectUri);

  res.cookie(config.cookies.refreshName, refreshToken, {
    ...config.cookies.options,
    maxAge: config.cookies.maxAge
  });

  res.status(200).json({
    message: 'Login GitHub exitoso',
    accessToken,
    isNewUser,
    usuario: serializeAuthUser(usuario)
  });
});
