import bcrypt from 'bcryptjs';
import { UsuarioModel, IUsuario } from '../models/usuarioModel.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { verifyFirebaseIdToken } from './firebaseAdminService.js';
import { ValidationError } from '../utils/AppError.js';

export const validateUserCredentials = async (email: string, password: string) => {
  const usuario = await UsuarioModel.findOne({ email: email.toLowerCase().trim() });
  if (!usuario) return null;
  if (usuario.authProvider && usuario.authProvider !== 'local') return null;
  if (!usuario.password) return null;

  const isMatch = await bcrypt.compare(password, usuario.password);
  if (!isMatch) return null;

  return usuario;
};

export const getTokens = (usuario: IUsuario) => {
  const roles = (usuario.roles ?? []) as Array<'OWNER' | 'INTERESTED' | 'ADMIN'>;

  const accessToken = generateAccessToken(String(usuario._id), usuario.fullName, usuario.email, roles);
  const refreshToken = generateRefreshToken(String(usuario._id), usuario.fullName, usuario.email, roles);

  return { accessToken, refreshToken };
};

export const refreshUserSession = async (incomingRefreshToken: string) => {
  const payload = verifyRefreshToken(incomingRefreshToken);
  const usuario = await UsuarioModel.findById(payload.id);

  if (!usuario) throw new Error('Usuario no encontrado');

  const tokens = getTokens(usuario);
  return { ...tokens, usuario };
};

export const loginWithFirebaseToken = async (idToken: string) => {
  const decoded = await verifyFirebaseIdToken(idToken);
  const provider = decoded.firebase?.sign_in_provider;

  if (provider !== 'google.com' && provider !== 'github.com') {
    throw new ValidationError('Proveedor Firebase no soportado');
  }

  const authProvider = provider === 'google.com' ? 'google' : 'github';
  const providerId = decoded.uid;
  const email = decoded.email?.toLowerCase().trim();
  const fullName = decoded.name || decoded.email?.split('@')[0] || 'Usuario';

  if (!email) {
    throw new ValidationError('No se pudo obtener email del proveedor OAuth');
  }

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
  return { ...tokens, usuario };
};
