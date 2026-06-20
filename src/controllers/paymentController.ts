import { Request, Response } from 'express';
import Stripe from 'stripe';
import { AuthRequest } from '../middlewares/auth.js';
import { asyncWrapper } from '../utils/asyncWrapper.js';
import { UnauthorizedError, ValidationError } from '../utils/AppError.js';
import * as paymentService from '../services/paymentService.js';
import { constructStripeWebhookEvent } from '../services/stripeService.js';

export const createCheckoutSession = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const roles = req.user?.roles ?? [];

  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const result = await paymentService.createCheckoutSessionForPayment({
    userId,
    roles,
    kind: req.body.kind,
    offerDraft: req.body.offerDraft
  });

  res.status(201).json(result);
});

const isCheckoutCompletedEvent = (
  event: Stripe.Event
): event is Stripe.Event & { data: { object: Stripe.Checkout.Session } } => event.type === 'checkout.session.completed';

const isCheckoutExpiredEvent = (
  event: Stripe.Event
): event is Stripe.Event & { data: { object: Stripe.Checkout.Session } } => event.type === 'checkout.session.expired';

export const handleStripeWebhook = asyncWrapper(async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    throw new ValidationError('Falta la firma del webhook de Stripe');
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
  const event = constructStripeWebhookEvent(rawBody, signature);

  if (isCheckoutCompletedEvent(event)) {
    await paymentService.completePaymentSessionFromStripe(event.data.object);
  }

  if (isCheckoutExpiredEvent(event)) {
    await paymentService.markPaymentSessionAsCanceled(event.data.object.id);
  }

  res.status(200).json({ received: true });
});

export const getCheckoutSessionStatus = asyncWrapper(async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const roles = req.user?.roles ?? [];

  if (!userId) {
    throw new UnauthorizedError('No autenticado');
  }

  const result = await paymentService.getPaymentSessionStatus(req.params.paymentSessionId, {
    id: userId,
    roles
  });

  res.status(200).json(result);
});
