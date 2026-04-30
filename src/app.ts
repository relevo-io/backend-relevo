import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { apiPort, config } from './config.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import ofertaRoutes from './routes/ofertaRoutes.js';
import solicitudRoutes from './routes/solicitudRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { globalErrorHandler } from './middlewares/errorMiddleware.js';
import { httpLogger } from './middlewares/loggerMiddleware.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';

const app = express();

/**
 * APPLICATION SETTINGS
 */
// Set the server port 
app.set('port', apiPort);

/**
 * MIDDLEWARES
 */

// Enable CORS con credenciales para permitir cookies HttpOnly (Refresh Token)
app.use(cors({
    origin: config.frontendUrl,
    credentials: true
}));

// Built-in middleware to parse incoming requests with JSON payloads
app.use(express.json());
app.use(cookieParser());

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
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/ofertas', ofertaRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/auth', authRoutes);

/**
 * 📖 API DOCUMENTATION (SWAGGER)
 */
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * ERROR HANDLING
 */
// Catch-all route for non-existent resources (404 Not Found)
app.use((req, res) => {
    res.status(404).json({ message: 'Resource not found' });
});

// Centralized error handler
app.use(globalErrorHandler);

export default app; // Default export for the server entry point

