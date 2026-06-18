import { Router } from 'express';
import * as alertaController from '../controllers/alertaController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { alertaIdParamsSchema, createAlertaSchema } from '../validators/alertaValidator.js';

const router = Router();

router.post('/', authenticateToken, validate({ body: createAlertaSchema }), alertaController.createAlert);
router.get('/', authenticateToken, alertaController.getAlerts);
router.delete(
  '/:alertaId',
  authenticateToken,
  validate({ params: alertaIdParamsSchema }),
  alertaController.deleteAlert
);

export default router;
