import bcrypt from 'bcryptjs';
import { UsuarioModel, IUsuario } from '../models/usuarioModel.js';
import { config } from '../config.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { verifyFirebaseIdToken } from './firebaseAdminService.js';
import { ValidationError } from '../utils/AppError.js';

interface GitHubUserProfile {
  id: number;
  login?: string;
  name?: string | null;
  email?: string | null;
}

const resolveGitHubEmail = async (accessToken?: string): Promise<string | null> => {
  if (!accessToken) return null;

  try {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'relevo-oauth'
      }
    });

    if (!response.ok) {
      return null;
    }

    const emails = (await response.json()) as Array<{ email?: string; primary?: boolean; verified?: boolean }>;
    const preferredEmail =
      emails.find((item) => item.primary && item.verified && item.email) ??
      emails.find((item) => item.verified && item.email) ??
      emails.find((item) => item.email);

    return preferredEmail?.email?.toLowerCase().trim() ?? null;
  } catch {
    return null;
  }
};

const upsertSocialUser = async ({
  authProvider,
  providerId,
  email,
  fullName
}: {
  authProvider: 'google' | 'github';
  providerId: string;
  email: string;
  fullName: string;
}) => {
  let isNewUser = false;
  let usuario = await UsuarioModel.findOne({ authProvider, providerId });
  if (!usuario) {
    usuario = await UsuarioModel.findOne({ email });
  }

  if (!usuario) {
    usuario = await UsuarioModel.create({
      fullName,
      email,
      roles: ['OWNER', 'INTERESTED'],
      authProvider,
      providerId,
      password: null
    });
    isNewUser = true;
  } else {
    const hasOwnerRole = usuario.roles?.includes('OWNER') ?? false;
    const hasInterestedRole = usuario.roles?.includes('INTERESTED') ?? false;
    const needsRoleBackfill = !hasOwnerRole || !hasInterestedRole;
    const requiresUpdate =
      usuario.authProvider !== authProvider || usuario.providerId !== providerId || needsRoleBackfill;

    if (requiresUpdate) {
      usuario.authProvider = authProvider;
      usuario.providerId = providerId;
      usuario.roles = ['OWNER', 'INTERESTED'];
      usuario.password = usuario.password ?? null;
      await usuario.save();
    }
  }

  const tokens = getTokens(usuario);
  return { ...tokens, usuario, isNewUser };
};

const fetchGitHubUserProfile = async (accessToken: string): Promise<GitHubUserProfile> => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'relevo-oauth'
    }
  });

  if (!response.ok) {
    throw new ValidationError('No se pudo obtener el perfil de GitHub.');
  }

  return (await response.json()) as GitHubUserProfile;
};

export const getGitHubAuthorizeUrl = (redirectUri: string, state: string): string => {
  if (!config.github.clientId || !config.github.clientSecret) {
    throw new ValidationError('GitHub OAuth no esta configurado en el servidor.');
  }

  const searchParams = new URLSearchParams({
    client_id: config.github.clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state
  });

  return `https://github.com/login/oauth/authorize?${searchParams.toString()}`;
};

export const validateUserCredentials = async (email: string, password: string): Promise<IUsuario | null> => {
  const usuario = await UsuarioModel.findOne({ email: email.toLowerCase().trim() });
  if (!usuario) return null;
  if (usuario.authProvider && usuario.authProvider !== 'local') return null;
  if (!usuario.password) return null;

  const isMatch = await bcrypt.compare(password, usuario.password);
  if (!isMatch) return null;

  return usuario;
};

export const getTokens = (usuario: IUsuario): { accessToken: string; refreshToken: string } => {
  const roles = (usuario.roles ?? []) as Array<'OWNER' | 'INTERESTED' | 'ADMIN'>;

  const accessToken = generateAccessToken(String(usuario._id), usuario.fullName, usuario.email, roles);
  const refreshToken = generateRefreshToken(String(usuario._id), usuario.fullName, usuario.email, roles);

  return { accessToken, refreshToken };
};

export const refreshUserSession = async (
  incomingRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string; usuario: IUsuario }> => {
  const payload = verifyRefreshToken(incomingRefreshToken);
  const usuario = await UsuarioModel.findById(payload.id);

  if (!usuario) throw new Error('Usuario no encontrado');

  const tokens = getTokens(usuario);
  return { ...tokens, usuario };
};

export const loginWithFirebaseToken = async (idToken: string, providerAccessToken?: string) => {
  const decoded = await verifyFirebaseIdToken(idToken);
  const provider = decoded.firebase?.sign_in_provider;

  if (provider !== 'google.com' && provider !== 'github.com') {
    throw new ValidationError('Proveedor Firebase no soportado');
  }

  const authProvider = provider === 'google.com' ? 'google' : 'github';
  const providerId = decoded.uid;
  const email =
    decoded.email?.toLowerCase().trim() ??
    (authProvider === 'github' ? await resolveGitHubEmail(providerAccessToken) : null);
  const fullName = decoded.name || decoded.email?.split('@')[0] || 'Usuario';

  if (!email) {
    throw new ValidationError(
      'No se pudo obtener el email de GitHub. Asegúrate de conceder acceso al correo o de tener un email disponible en tu cuenta.'
    );
  }

  return upsertSocialUser({
    authProvider,
    providerId,
    email,
    fullName
  });
};

export const loginWithGitHubCode = async (code: string, redirectUri: string) => {
  if (!config.github.clientId || !config.github.clientSecret) {
    throw new ValidationError('GitHub OAuth no esta configurado en el servidor.');
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'relevo-oauth'
    },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!tokenResponse.ok) {
    throw new ValidationError('No se pudo completar el acceso con GitHub.');
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenPayload.access_token) {
    throw new ValidationError(tokenPayload.error_description || 'No se pudo completar el acceso con GitHub.');
  }

  const profile = await fetchGitHubUserProfile(tokenPayload.access_token);
  const email = profile.email?.toLowerCase().trim() ?? (await resolveGitHubEmail(tokenPayload.access_token)) ?? null;

  if (!email) {
    throw new ValidationError(
      'No se pudo obtener el email de GitHub. Asegurate de conceder acceso al correo o de tener un email disponible en tu cuenta.'
    );
  }

  const fullName = profile.name?.trim() || profile.login?.trim() || email.split('@')[0] || 'Usuario';

  return upsertSocialUser({
    authProvider: 'github',
    providerId: String(profile.id),
    email,
    fullName
  });
};
