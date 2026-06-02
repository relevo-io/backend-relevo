import { Router } from 'express';
import * as notificacionController from '../controllers/notificacionController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticateToken, notificacionController.getNotifications);
router.patch('/:notificacionId/read', authenticateToken, notificacionController.markAsRead);

export default router;
