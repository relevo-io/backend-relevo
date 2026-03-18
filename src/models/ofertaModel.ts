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

/**
 * @openapi
 * components:
 *   schemas:
 *     Oferta:
 *       type: object
 *       required:
 *         - region
 *         - sector
 *         - owner
 *         - companyDescription
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de MongoDB
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         region:
 *           type: string
 *           example: 'Catalunya'
 *         sector:
 *           type: string
 *           example: 'Tecnologia'
 *         revenueRange:
 *           type: string
 *           enum: [UNDER_100K, BETWEEN_100K_500K, BETWEEN_500K_1M, BETWEEN_1M_5M, OVER_5M]
 *           example: 'BETWEEN_100K_500K'
 *         owner:
 *           type: string
 *           description: ID de l'usuari propietari (referència a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         businessAgeYears:
 *           type: number
 *           minimum: 0
 *           example: 5
 *         employeeRange:
 *           type: string
 *           enum: [1_5, 6_10, 11_25, 26_50, 51_100, 100_PLUS]
 *           example: '11_25'
 *         companyDescription:
 *           type: string
 *           maxLength: 3000
 *           example: 'Empresa de tecnologia sostenible fundada el 2019.'
 *         publishedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
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
