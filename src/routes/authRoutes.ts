import express from 'express';
import { login, logout, refreshToken, getMe } from '../controllers/authController.js';
import { z } from 'zod';
import { validate } from '../middlewares/validatorMiddleware.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Endpoints de autenticación
 *
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión y devuelve el JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "omar@gmail.com"
 *               password:
 *                 type: string
 *                 example: "secret123"
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve token
 *       401:
 *         description: Credenciales incorrectas
 */
router.post('/login', validate({ body: loginSchema }), login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: Refresca el token JWT
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refrescado correctamente
 *       401:
 *         description: No autorizado (token faltante o inválido)
 */
router.post('/refresh', refreshToken);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Cierra sesión y revoca el refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout exitoso
 */
router.post('/logout', logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Obtiene el perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario obtenido con éxito
 *       401:
 *         description: No autorizado
 */
router.get('/me', authenticateToken, getMe);

export default router;
