import { Schema, model, Types } from 'mongoose';

export const accessRequestStatuses = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;

/**
 * @openapi
 * components:
 *   schemas:
 *     Solicitud:
 *       type: object
 *       required:
 *         - owner
 *         - interestedUser
 *         - opportunity
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de MongoDB
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         owner:
 *           type: string
 *           description: ID de l'usuari propietari (referència a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         interestedUser:
 *           type: string
 *           description: ID de l'usuari interessat (referència a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d2'
 *         opportunity:
 *           type: string
 *           description: ID de l'oferta (referència a Oferta)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d3'
 *         status:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED]
 *           default: PENDING
 *           example: 'PENDING'
 *         message:
 *           type: string
 *           maxLength: 1000
 *           example: 'Estic interessat en la teva empresa. Podríem parlar?'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export interface ISolicitud {
  _id?: Types.ObjectId;
  owner: Types.ObjectId;
  interestedUser: Types.ObjectId;
  opportunity: Types.ObjectId;
  status: (typeof accessRequestStatuses)[number];
  message?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const solicitudSchema = new Schema<ISolicitud>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    interestedUser: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    opportunity: {
      type: Schema.Types.ObjectId,
      ref: 'Oferta',
      required: true
    },
    status: {
      type: String,
      enum: accessRequestStatuses,
      default: 'PENDING',
      required: true
    },
    message: {
      type: String,
      required: false,
      maxlength: 1000
    }
  },
  {
    timestamps: true
  }
);

solicitudSchema.index(
  { opportunity: 1, interestedUser: 1 },
  { unique: true, name: 'uniq_opportunity_interested_user' }
);

export const SolicitudModel = model<ISolicitud>('Solicitud', solicitudSchema);
