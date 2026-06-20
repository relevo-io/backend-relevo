import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { TEST_OWNER, TEST_USER } from './setup.js';
import { UsuarioModel } from '../src/models/usuarioModel.js';
import { OfertaModel } from '../src/models/ofertaModel.js';
import { PaymentSessionModel } from '../src/models/paymentSessionModel.js';
import * as stripeService from '../src/services/stripeService.js';

vi.mock('../src/services/stripeService.js', () => ({
  createStripeCheckoutSession: vi.fn(),
  constructStripeWebhookEvent: vi.fn()
}));

describe('Stripe payments', () => {
  let ownerToken: string;
  let userToken: string;
  let ownerId: string;
  let userId: string;

  beforeEach(async () => {
    vi.resetAllMocks();

    const ownerLogin = await request(app).post('/api/auth/login').send({
      email: TEST_OWNER.email,
      password: TEST_OWNER.password
    });
    ownerToken = ownerLogin.body.accessToken;

    const userLogin = await request(app).post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    userToken = userLogin.body.accessToken;

    const owner = await UsuarioModel.findOne({ email: TEST_OWNER.email }).lean();
    const user = await UsuarioModel.findOne({ email: TEST_USER.email }).lean();
    ownerId = String(owner!._id);
    userId = String(user!._id);
  });

  it('should create a checkout session for pro activation', async () => {
    vi.mocked(stripeService.createStripeCheckoutSession).mockResolvedValue({
      id: 'cs_test_pro',
      url: 'https://checkout.stripe.test/pro'
    });

    const response = await request(app)
      .post('/api/payments/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ kind: 'pro_activation' });

    expect(response.status).toBe(201);
    expect(response.body.checkoutUrl).toBe('https://checkout.stripe.test/pro');
    expect(stripeService.createStripeCheckoutSession).toHaveBeenCalledTimes(1);

    const saved = await PaymentSessionModel.findById(response.body.paymentSessionId).lean();
    expect(saved?.kind).toBe('pro_activation');
    expect(saved?.status).toBe('pending');
  });

  it('should create a checkout session for offer publication', async () => {
    vi.mocked(stripeService.createStripeCheckoutSession).mockResolvedValue({
      id: 'cs_test_offer',
      url: 'https://checkout.stripe.test/offer'
    });

    const response = await request(app)
      .post('/api/payments/checkout-session')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        kind: 'offer_publication',
        offerDraft: {
          region: 'Barcelona',
          sector: 'Technology',
          companyDescription: 'Software company with recurring revenue'
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.checkoutUrl).toBe('https://checkout.stripe.test/offer');

    const saved = await PaymentSessionModel.findById(response.body.paymentSessionId).lean();
    expect(saved?.kind).toBe('offer_publication');
    expect(saved?.offerDraft?.region).toBe('Barcelona');
  });

  it('should reject checkout session creation when role does not match', async () => {
    const response = await request(app)
      .post('/api/payments/checkout-session')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        kind: 'offer_publication',
        offerDraft: {
          region: 'Barcelona',
          sector: 'Technology',
          companyDescription: 'Software company with recurring revenue'
        }
      });

    expect(response.status).toBe(403);
  });

  it('should complete pro activation from a valid webhook', async () => {
    const paymentSession = await PaymentSessionModel.create({
      userId,
      kind: 'pro_activation',
      status: 'pending',
      stripeCheckoutSessionId: 'cs_webhook_pro',
      amount: 1990,
      currency: 'eur'
    });

    vi.mocked(stripeService.constructStripeWebhookEvent).mockReturnValue({
      id: 'evt_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_webhook_pro',
          object: 'checkout.session',
          metadata: {
            paymentSessionId: String(paymentSession._id),
            userId,
            kind: 'pro_activation'
          },
          payment_intent: 'pi_pro_1'
        }
      }
    } as never);

    const response = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'test_signature')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(200);

    const updatedUser = await UsuarioModel.findById(userId).lean();
    expect(updatedUser?.proExpiresAt).toBeTruthy();

    const updatedSession = await PaymentSessionModel.findById(paymentSession._id).lean();
    expect(updatedSession?.status).toBe('completed');
    expect(updatedSession?.stripePaymentIntentId).toBe('pi_pro_1');
  });

  it('should create exactly one offer from a paid publication webhook', async () => {
    const paymentSession = await PaymentSessionModel.create({
      userId: ownerId,
      kind: 'offer_publication',
      status: 'pending',
      stripeCheckoutSessionId: 'cs_webhook_offer',
      amount: 9900,
      currency: 'eur',
      offerDraft: {
        region: 'Madrid',
        sector: 'Retail',
        companyDescription: 'Neighborhood retail company'
      }
    });

    vi.mocked(stripeService.constructStripeWebhookEvent).mockReturnValue({
      id: 'evt_offer_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_webhook_offer',
          object: 'checkout.session',
          metadata: {
            paymentSessionId: String(paymentSession._id),
            userId: ownerId,
            kind: 'offer_publication'
          },
          payment_intent: 'pi_offer_1'
        }
      }
    } as never);

    const firstResponse = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'test_signature')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));
    expect(firstResponse.status).toBe(200);

    const secondResponse = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'test_signature')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));
    expect(secondResponse.status).toBe(200);

    const offers = await OfertaModel.find({ owner: ownerId }).lean();
    expect(offers).toHaveLength(1);

    const updatedOwner = await UsuarioModel.findById(ownerId).lean();
    expect(updatedOwner?.publicationCredits).toBe(0);

    const updatedSession = await PaymentSessionModel.findById(paymentSession._id).lean();
    expect(updatedSession?.status).toBe('completed');
    expect(updatedSession?.createdOfferId).toBeTruthy();
  });

  it('should reject invalid webhook signatures', async () => {
    vi.mocked(stripeService.constructStripeWebhookEvent).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const response = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'bad_signature')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(response.status).toBe(500);
  });
});
