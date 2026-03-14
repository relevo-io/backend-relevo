import { Schema, model, Types } from 'mongoose';

export const revenueRanges = [
  'UNDER_100K',
  'BETWEEN_100K_500K',
  'BETWEEN_500K_1M',
  'BETWEEN_1M_5M',
  'OVER_5M'
] as const;

export const employeeRanges = [
  '1_5',
  '6_10',
  '11_25',
  '26_50',
  '51_100',
  '100_PLUS'
] as const;

export interface IOferta {
  _id?: Types.ObjectId;
  region: string;
  sector: string;
  revenueRange?: (typeof revenueRanges)[number];
  owner: Types.ObjectId;
  businessAgeYears?: number;
  employeeRange?: (typeof employeeRanges)[number];
  companyDescription: string;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const ofertaSchema = new Schema<IOferta>(
  {
    region: {
      type: String,
      required: true,
      trim: true
    },
    sector: {
      type: String,
      required: true,
      trim: true
    },
    revenueRange: {
      type: String,
      required: false,
      enum: revenueRanges
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    businessAgeYears: {
      type: Number,
      required: false,
      min: 0
    },
    employeeRange: {
      type: String,
      required: false,
      enum: employeeRanges
    },
    companyDescription: {
      type: String,
      required: true,
      maxlength: 3000
    },
    publishedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const OfertaModel = model<IOferta>('Oferta', ofertaSchema);
