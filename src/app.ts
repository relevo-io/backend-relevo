import express, { Request, Response } from 'express';
import cors from 'cors';
import { apiPort } from './config.js'; 
import userRoutes from './routes/userRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import { httpLogger } from './middlewares/loggerMiddleware.js';

const app = express();

/**
 * APPLICATION SETTINGS
 */
// Set the server port 
app.set('port', apiPort);

/**
 * MIDDLEWARES
 */

// Enable CORS for all routes 
app.use(cors());

// Built-in middleware to parse incoming requests with JSON payloads
app.use(express.json());

// Logging middleware: Logs every incoming HTTP request using Pino
app.use(httpLogger);

/**
 * ⚡️ HEALTH CHECK / PING
 * Simple, stateless endpoint to verify the server is running.
 */
app.get('/ping', (_req: Request, res: Response) => {
    res.status(200).json({ 
        status: 'ok', 
        uptime: process.uptime(),
        timestamp: new Date().toISOString() 
    });
});

/**
 * API ROUTES
 */
// Resource-based routing
app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);

/**
 * ERROR HANDLING
 */
// Catch-all route for non-existent resources (404 Not Found)
app.use((req, res) => {
    res.status(404).json({ message: 'Resource not found' });
});

export default app; // Default export for the server entry point