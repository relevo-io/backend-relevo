import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import * as authService from '../services/authService.js';
import { AuthRequest } from '../middlewares/auth.js';
import { UsuarioModel } from '../models/usuarioModel.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    try {
        const usuario = await authService.validateUserCredentials(email, password);

        if (!usuario) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const { accessToken, refreshToken } = authService.getTokens(usuario);

        res.cookie(config.cookies.refreshName, refreshToken, {
            ...config.cookies.options,
            maxAge: config.cookies.maxAge
        });

        return res.status(200).json({
            message: 'Login exitoso',
            accessToken,
            usuario: {
                _id: usuario._id,
                fullName: usuario.fullName,
                email: usuario.email,
                roles: usuario.roles
            }
        });
    } catch (error) {
        return res.status(500).json({ error });
    }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const incomingRefreshToken = req.cookies?.[config.cookies.refreshName] || req.body?.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({ message: 'Refresh token requerido' });
        }

        const { accessToken, refreshToken: newRefreshToken } = await authService.refreshUserSession(incomingRefreshToken);

        res.cookie(config.cookies.refreshName, newRefreshToken, {
            ...config.cookies.options,
            maxAge: config.cookies.maxAge
        });

        return res.status(200).json({
            message: 'Token refrescado',
            accessToken
        });
    } catch (error) {
        return res.status(401).json({ message: 'Refresh token expirado o inválido' });
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.clearCookie(config.cookies.refreshName, {
            ...config.cookies.options
        });

        return res.status(200).json({ message: 'Logout exitoso' });
    } catch (error) {
        return res.status(500).json({ error });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const usuario = await UsuarioModel.findById(req.user?.id).select('-password');
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        return res.status(200).json(usuario);
    } catch (error) {
        return res.status(500).json({ error });
    }
};

