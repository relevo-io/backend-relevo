import { Schema, Types, model } from 'mongoose';

export const paymentKinds = ['offer_publication', 'pro_activation'] as const;
export const paymentStatuses = ['pending', 'processing', 'completed', 'failed', 'canceled'] as const;

export type PaymentKind = (typeof paymentKinds)[number];
export type PaymentStatus = (typeof paymentStatuses)[number];

export interface OfferDraftSnapshot {
  region: string;
  sector: string;
  revenueRange?: string;
  creationYear?: number;
  employeeRange?: string;
  companyDescription: string;
  extendedDescription?: string;
  owner?: string;
}

export interface IPaymentSession {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  kind: PaymentKind;
  status: PaymentStatus;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  amount: number;
  currency: string;
  offerDraft?: OfferDraftSnapshot | null;
  createdOfferId?: Types.ObjectId | null;
  proExpiresAtGranted?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const offerDraftSchema = new Schema<OfferDraftSnapshot>(
  {
    region: { type: String, required: true, trim: true },
    sector: { type: String, required: true, trim: true },
    revenueRange: { type: String, required: false },
    creationYear: { type: Number, required: false },
    employeeRange: { type: String, required: false },
    companyDescription: { type: String, required: true, trim: true },
    extendedDescription: { type: String, required: false, trim: true },
    owner: { type: String, required: false }
  },
  { _id: false }
);

const paymentSessionSchema = new Schema<IPaymentSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true
    },
    kind: {
      type: String,
      enum: paymentKinds,
      required: true
    },
    status: {
      type: String,
      enum: paymentStatuses,
      required: true,
      default: 'pending'
    },
    stripeCheckoutSessionId: {
      type: String,
      required: true,
      unique: true
    },
    stripePaymentIntentId: {
      type: String,
      required: false,
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'eur'
    },
    offerDraft: {
      type: offerDraftSchema,
      required: false,
      default: null
    },
    createdOfferId: {
      type: Schema.Types.ObjectId,
      ref: 'Oferta',
      required: false,
      default: null
    },
    proExpiresAtGranted: {
      type: Date,
      required: false,
      default: null
    },
    completedAt: {
      type: Date,
      required: false,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export const PaymentSessionModel = model<IPaymentSession>('PaymentSession', paymentSessionSchema);
