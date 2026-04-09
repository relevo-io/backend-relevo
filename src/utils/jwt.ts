import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { IJwtPayload } from "../models/JwtPayload.js";

export const generateAccessToken = (userId: string, fullName: string, email: string, roles: Array<'OWNER' | 'INTERESTED' | 'ADMIN'>) => {
    const payload: IJwtPayload = { id: userId, fullName, email, roles };
    return jwt.sign(
        payload,
        config.jwt.accessSecret,
        { expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions["expiresIn"] }
    );
};

export const generateRefreshToken = (userId: string, fullName: string, email: string, roles: Array<'OWNER' | 'INTERESTED' | 'ADMIN'>) => {
    const payload: IJwtPayload = { id: userId, fullName, email, roles };
    return jwt.sign(
        payload,
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions["expiresIn"] }
    );
};

export const verifyAccessToken = (token: string) => {
    return jwt.verify(token, config.jwt.accessSecret) as IJwtPayload;
};

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, config.jwt.refreshSecret) as IJwtPayload;
};
