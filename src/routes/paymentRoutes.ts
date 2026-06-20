import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { validate } from '../middlewares/validatorMiddleware.js';
import { createCheckoutSessionSchema, paymentSessionIdParamsSchema } from '../validators/paymentValidator.js';

const router = Router();

router.post(
  '/checkout-session',
  authenticateToken,
  validate({ body: createCheckoutSessionSchema }),
  paymentController.createCheckoutSession
);

router.get(
  '/checkout-session/:paymentSessionId/status',
  authenticateToken,
  validate({ params: paymentSessionIdParamsSchema }),
  paymentController.getCheckoutSessionStatus
);

export default router;
