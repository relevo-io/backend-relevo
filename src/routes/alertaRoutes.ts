import { Router } from 'express';
import * as alertaController from '../controllers/alertaController.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.post('/', authenticateToken, alertaController.createAlert);
router.get('/', authenticateToken, alertaController.getAlerts);
router.delete('/:alertaId', authenticateToken, alertaController.deleteAlert);

export default router;
