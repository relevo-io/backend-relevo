import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

/**
 * API CONFIGURATION
 */

export const apiPort = process.env.PORT || 4000;

/**
 * MONGO CONFIGURATION
 */
export const config = {
    mongoUri: process.env.MONGO_URI,
    logLevel: process.env.LOG_LEVEL || 'info',
    frontendUrl: process.env.FRONTEND_URL,
    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || "LlaveSecretaDefault",
        refreshSecret: process.env.JWT_REFRESH_SECRET || "LlaveRefreshDefault",
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "12h",
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
    },
    cookies: {
        refreshName: 'refreshToken',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        options: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/'
        }
    }
};

/**
 * PINO LOGGER CONFIGURATION
 * We use 'pino-pretty' in development for readable logs, 
 * but in production, it sends structured JSON.
 */

export const logger = pino({
    level: config.logLevel,
    transport: {
        target: 'pino-pretty', // Makes logs readable in the terminal
        options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
        },
    },
});

