import express from 'express';
import {
  login,
  logout,
  refreshToken,
  getMe,
  firebaseLogin,
  getGitHubAuthorizeUrl,
  oauthLogin
} from '../controllers/authController.js';
import { z } from 'zod';
import { validate } from '../middlewares/validatorMiddleware.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
const firebaseLoginSchema = z.object({
  idToken: z.string().min(1),
  providerAccessToken: z.string().min(1).optional()
});
const oauthStartSchema = z.object({
  redirectUri: z.string().url(),
  state: z.string().min(1)
});
const oauthLoginSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url()
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
 * /api/auth/firebase:
 *   post:
 *     summary: Inicia sesión con un token de Firebase
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Token de ID generado por Firebase Authentication
 *                 example: "eyJhbGciOiJSUzI1NiIs..."
 *               providerAccessToken:
 *                 type: string
 *                 description: Token de acceso del proveedor (opcional)
 *                 example: "gho_123456789..."
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve token
 *       400:
 *         description: Token inválido o parámetros incorrectos
 */
router.post('/firebase', validate({ body: firebaseLoginSchema }), firebaseLogin);

/**
 * @openapi
 * /api/auth/oauth/github/start:
 *   post:
 *     summary: Obtiene la URL de autorización para el login con GitHub
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [redirectUri, state]
 *             properties:
 *               redirectUri:
 *                 type: string
 *                 format: uri
 *                 description: URI a la que redirigirá GitHub tras la autorización
 *                 example: "http://localhost:3000/auth/callback"
 *               state:
 *                 type: string
 *                 description: Estado para prevenir CSRF
 *                 example: "random_state_string"
 *     responses:
 *       200:
 *         description: URL de autorización generada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   example: "https://github.com/login/oauth/authorize?..."
 *       400:
 *         description: Parámetros inválidos
 */
router.post('/oauth/github/start', validate({ body: oauthStartSchema }), getGitHubAuthorizeUrl);

/**
 * @openapi
 * /api/auth/oauth/{provider}:
 *   post:
 *     summary: Completa la autenticación OAuth con el proveedor especificado (por ejemplo, github)
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del proveedor OAuth (e.g., github)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, redirectUri]
 *             properties:
 *               code:
 *                 type: string
 *                 description: Código de autorización devuelto por el proveedor OAuth
 *                 example: "a1b2c3d4e5f6"
 *               redirectUri:
 *                 type: string
 *                 format: uri
 *                 description: URI de redirección registrada originalmente
 *                 example: "http://localhost:3000/auth/callback"
 *     responses:
 *       200:
 *         description: Autenticación exitosa, devuelve token
 *       400:
 *         description: Código o URI inválidos
 *       500:
 *         description: Error en la comunicación con el proveedor OAuth
 */
router.post('/oauth/:provider', validate({ body: oauthLoginSchema }), oauthLogin);

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
