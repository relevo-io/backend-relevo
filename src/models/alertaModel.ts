import { Schema, model, Types } from 'mongoose';
import { employeeRanges, revenueRanges } from './ofertaModel.js';

export interface IAlertaMatchedOffer {
  offerId: Types.ObjectId;
  matchedAt: Date;
}

export interface IAlerta {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  name?: string;
  revenueRange?: string;
  employeeRange?: string;
  region?: string;
  isActive: boolean;
  matchedOffers?: IAlertaMatchedOffer[];
  createdAt?: Date;
  updatedAt?: Date;
}

const alertaSchema = new Schema<IAlerta>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    name: {
      type: String,
      trim: true,
      maxlength: 80
    },
    revenueRange: {
      type: String,
      required: false,
      enum: revenueRanges
    },
    employeeRange: {
      type: String,
      required: false,
      enum: employeeRanges
    },
    region: {
      type: String,
      trim: true,
      maxlength: 120
    },
    isActive: {
      type: Boolean,
      default: true
    },
    matchedOffers: {
      type: [
        {
          offerId: {
            type: Schema.Types.ObjectId,
            ref: 'Oferta',
            required: true
          },
          matchedAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    }
  },
  {
    timestamps: true
  }
);

alertaSchema.index({ userId: 1, createdAt: -1 });
alertaSchema.index({ isActive: 1, userId: 1 });

export const AlertaModel = model<IAlerta>('Alerta', alertaSchema);
