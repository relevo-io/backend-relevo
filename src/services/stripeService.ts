import Stripe from 'stripe';
import { config } from '../config.js';
import { InternalServerError } from '../utils/AppError.js';

let stripeClient: Stripe | null = null;

const getStripeClient = (): Stripe => {
  if (!config.stripe.secretKey) {
    throw new InternalServerError('Stripe no esta configurado');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripe.secretKey);
  }

  return stripeClient;
};

export interface CreateStripeCheckoutSessionInput {
  amount: number;
  currency: string;
  name: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export const createStripeCheckoutSession = async (
  input: CreateStripeCheckoutSessionInput
): Promise<Pick<Stripe.Checkout.Session, 'id' | 'url'>> => {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    line_items: [
      {
        price_data: {
          currency: input.currency,
          product_data: {
            name: input.name,
            description: input.description
          },
          unit_amount: input.amount
        },
        quantity: 1
      }
    ],
    metadata: input.metadata
  });

  if (!session.url) {
    throw new InternalServerError('Stripe no devolvio una URL de checkout');
  }

  return {
    id: session.id,
    url: session.url
  };
};

export const constructStripeWebhookEvent = (payload: Buffer, signature: string): Stripe.Event => {
  if (!config.stripe.webhookSecret) {
    throw new InternalServerError('Stripe webhook no esta configurado');
  }

  return getStripeClient().webhooks.constructEvent(payload, signature, config.stripe.webhookSecret);
};
