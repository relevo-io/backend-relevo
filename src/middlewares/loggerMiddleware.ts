import { Request, Response, NextFunction } from 'express';
import { logger } from '../config.js';

/**
 * HTTP LOGGER MIDDLEWARE
 * Intercepts both the incoming request and the outgoing response to log 
 * metadata such as method, URL, status code, and processing time.
 */
export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now(); // Record the start time

    // Log the incoming request
    logger.info(`--> ${req.method} ${req.url}`);

    // Listen for the 'finish' event to log the response details
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { statusCode } = res;

        // Use warning level for client/server errors (4xx, 5xx)
        if (statusCode >= 400) {
            logger.warn(`<-- ${req.method} ${req.url} ${statusCode} (${duration}ms)`);
        } else {
            logger.info(`<-- ${req.method} ${req.url} ${statusCode} (${duration}ms)`);
        }
    });

    next();
};