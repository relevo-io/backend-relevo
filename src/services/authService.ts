import bcrypt from 'bcryptjs';
import { UsuarioModel } from '../models/usuarioModel.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';

export const validateUserCredentials = async (email: string, password: string) => {
    const usuario = await UsuarioModel.findOne({ email: email.toLowerCase().trim() });
    if (!usuario) return null;

    const isMatch = await bcrypt.compare(password, usuario.password);
    if (!isMatch) return null;

    return usuario;
};

export const getTokens = (usuario: any) => {
    const roles = (usuario.roles ?? []) as Array<'OWNER' | 'INTERESTED' | 'ADMIN'>;

    const accessToken = generateAccessToken(
        String(usuario._id),
        usuario.fullName,
        usuario.email,
        roles
    );
    const refreshToken = generateRefreshToken(
        String(usuario._id),
        usuario.fullName,
        usuario.email,
        roles
    );

    return { accessToken, refreshToken };
};

export const refreshUserSession = async (incomingRefreshToken: string) => {
    const payload = verifyRefreshToken(incomingRefreshToken);
    const usuario = await UsuarioModel.findById(payload.id);

    if (!usuario) throw new Error('Usuario no encontrado');

    const tokens = getTokens(usuario);
    return tokens;
};
