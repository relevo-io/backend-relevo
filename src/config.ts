import pino from 'pino';

/**
 * API CONFIGURATION
 */

export const apiPort = process.env.PORT || 4000;

/**
 * MONGO CONFIGURATION
 */
export const config = {
    mongoUri: 'mongodb://127.0.0.1:27017/ea-exercise-mongoose',
    logLevel: 'info',
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