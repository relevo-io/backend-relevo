import Stripe from 'stripe';
import { Types } from 'mongoose';
import { config } from '../config.js';
import { IOferta } from '../models/ofertaModel.js';
import {
  IPaymentSession,
  OfferDraftSnapshot,
  PaymentKind,
  PaymentSessionModel
} from '../models/paymentSessionModel.js';
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/AppError.js';
import { createStripeCheckoutSession } from './stripeService.js';
import * as usuarioService from './usuarioService.js';
import * as ofertaService from './ofertaService.js';

const PAYMENT_PRICES: Record<PaymentKind, number> = {
  offer_publication: 9900,
  pro_activation: 1990
};

const PAYMENT_LABELS: Record<PaymentKind, { name: string; description: string }> = {
  offer_publication: {
    name: 'Publicacion de oferta en Relevo',
    description: 'Pago unico para publicar una oferta'
  },
  pro_activation: {
    name: 'Relevo Pro 30 dias',
    description: 'Pago unico para activar Relevo Pro durante 30 dias'
  }
};

interface ViewerAccess {
  id: string;
  roles: string[];
}

interface CreateCheckoutSessionInput {
  userId: string;
  roles: string[];
  kind: PaymentKind;
  offerDraft?: OfferDraftSnapshot;
}

const assertCheckoutPermissions = (kind: PaymentKind, roles: string[]): void => {
  if (kind === 'pro_activation' && !roles.some((role) => role === 'INTERESTED' || role === 'ADMIN')) {
    throw new ForbiddenError('No autorizado por rol');
  }

  if (kind === 'offer_publication' && !roles.some((role) => role === 'OWNER' || role === 'ADMIN')) {
    throw new ForbiddenError('No autorizado por rol');
  }
};

const buildSuccessUrl = (paymentSessionId: string): string =>
  `${config.frontendUrl}/pago/resultado?paymentSessionId=${paymentSessionId}`;

const buildCancelUrl = (paymentSessionId: string): string =>
  `${config.frontendUrl}/pago/resultado?paymentSessionId=${paymentSessionId}&canceled=1`;

const toOfferPayload = (userId: string, draft: OfferDraftSnapshot): Partial<IOferta> =>
  ({
    ...draft,
    owner: new Types.ObjectId(userId)
  }) as Partial<IOferta>;

export const createCheckoutSessionForPayment = async ({
  userId,
  roles,
  kind,
  offerDraft
}: CreateCheckoutSessionInput): Promise<{ checkoutUrl: string; paymentSessionId: string }> => {
  assertCheckoutPermissions(kind, roles);

  if (kind === 'offer_publication' && !offerDraft) {
    throw new ValidationError('El borrador de la oferta es obligatorio');
  }

  if (!config.frontendUrl) {
    throw new ValidationError('FRONTEND_URL no esta configurado');
  }

  const amount = PAYMENT_PRICES[kind];
  const currency = config.stripe.currency;
  const placeholderCheckoutId = `pending_${new Types.ObjectId().toString()}`;

  const sessionDoc = await PaymentSessionModel.create({
    userId: new Types.ObjectId(userId),
    kind,
    status: 'pending',
    stripeCheckoutSessionId: placeholderCheckoutId,
    amount,
    currency,
    offerDraft: kind === 'offer_publication' ? offerDraft : null
  });

  const paymentSessionId = String(sessionDoc._id);

  try {
    const checkoutSession = await createStripeCheckoutSession({
      amount,
      currency,
      ...PAYMENT_LABELS[kind],
      successUrl: buildSuccessUrl(paymentSessionId),
      cancelUrl: buildCancelUrl(paymentSessionId),
      metadata: {
        paymentSessionId,
        userId,
        kind
      }
    });

    await PaymentSessionModel.findByIdAndUpdate(sessionDoc._id, {
      $set: { stripeCheckoutSessionId: checkoutSession.id }
    });

    const checkoutUrl = checkoutSession.url;
    if (!checkoutUrl) {
      throw new ValidationError('Stripe no devolvio una URL de checkout');
    }

    return {
      checkoutUrl,
      paymentSessionId
    };
  } catch (error) {
    await PaymentSessionModel.findByIdAndUpdate(sessionDoc._id, {
      $set: { status: 'failed' }
    });
    throw error;
  }
};

export const completePaymentSessionFromStripe = async (checkoutSession: Stripe.Checkout.Session): Promise<void> => {
  const paymentSessionId = checkoutSession.metadata?.['paymentSessionId'];
  if (!paymentSessionId) {
    throw new ValidationError('La sesion de Stripe no contiene paymentSessionId');
  }

  const claimed = await PaymentSessionModel.findOneAndUpdate(
    { _id: paymentSessionId, status: 'pending' },
    {
      $set: {
        status: 'processing',
        stripePaymentIntentId:
          typeof checkoutSession.payment_intent === 'string' ? checkoutSession.payment_intent : null
      }
    },
    { new: true }
  ).lean();

  if (!claimed) {
    const existing = await PaymentSessionModel.findById(paymentSessionId).lean();
    if (!existing) {
      throw new NotFoundError('Sesion de pago no encontrada');
    }

    if (existing.status === 'completed' || existing.status === 'processing') {
      return;
    }

    throw new ValidationError('La sesion de pago no esta pendiente');
  }

  try {
    if (claimed.kind === 'pro_activation') {
      const usuario = await usuarioService.activarPlanPro(String(claimed.userId));
      await PaymentSessionModel.findByIdAndUpdate(claimed._id, {
        $set: {
          status: 'completed',
          proExpiresAtGranted: usuario.proExpiresAt ?? null,
          completedAt: new Date()
        }
      });
      return;
    }

    if (!claimed.offerDraft) {
      throw new ValidationError('No hay borrador asociado a la sesion de publicacion');
    }

    await usuarioService.otorgarCreditoPublicacion(String(claimed.userId));
    await usuarioService.consumirCreditoPublicacion(String(claimed.userId));
    const createdOffer = await ofertaService.crearOferta(toOfferPayload(String(claimed.userId), claimed.offerDraft));

    await PaymentSessionModel.findByIdAndUpdate(claimed._id, {
      $set: {
        status: 'completed',
        createdOfferId: createdOffer._id ?? null,
        completedAt: new Date()
      }
    });
  } catch (error) {
    await PaymentSessionModel.findByIdAndUpdate(claimed._id, {
      $set: { status: 'failed' }
    });
    throw error;
  }
};

export const markPaymentSessionAsCanceled = async (stripeCheckoutSessionId: string): Promise<void> => {
  await PaymentSessionModel.findOneAndUpdate(
    { stripeCheckoutSessionId, status: { $in: ['pending', 'processing'] } },
    { $set: { status: 'canceled' } }
  );
};

export const getPaymentSessionStatus = async (
  paymentSessionId: string,
  viewer: ViewerAccess
): Promise<{
  status: IPaymentSession['status'];
  kind: PaymentKind;
  createdOfferId?: string;
  proActive?: boolean;
  proExpiresAt?: Date | null;
}> => {
  const session = await PaymentSessionModel.findById(paymentSessionId).lean();
  if (!session) {
    throw new NotFoundError('Sesion de pago no encontrada');
  }

  const isAdmin = viewer.roles.includes('ADMIN');
  if (!isAdmin && String(session.userId) !== viewer.id) {
    throw new UnauthorizedError('No autenticado');
  }

  const result: {
    status: IPaymentSession['status'];
    kind: PaymentKind;
    createdOfferId?: string;
    proActive?: boolean;
    proExpiresAt?: Date | null;
  } = {
    status: session.status,
    kind: session.kind
  };

  if (session.createdOfferId) {
    result.createdOfferId = String(session.createdOfferId);
  }

  if (session.kind === 'pro_activation') {
    const usuario = await usuarioService.obtenerUsuarioPorId(String(session.userId));
    result.proActive = usuario?.proActive ?? false;
    result.proExpiresAt = usuario?.proExpiresAt ?? null;
  }

  return result;
};
