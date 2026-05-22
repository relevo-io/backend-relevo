import { Schema, model, Types } from 'mongoose';

export const accessRequestStatuses = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;
export const analysisStatuses = ['PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'ERROR'] as const;

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
export interface IResultadoIa {
  resumen: string;
  nota: number;
  comentarioNota: string;
  puntosFuertes: string[];
  experienciaDestacada: string[];
}

export interface ISolicitud {
  _id?: Types.ObjectId;
  owner: Types.ObjectId;
  interestedUser: Types.ObjectId;
  opportunity: Types.ObjectId;
  status: (typeof accessRequestStatuses)[number];
  message?: string;
  cvKey?: string;
  estadoAnalisis?: (typeof analysisStatuses)[number];
  resultadoIa?: IResultadoIa;
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
    },
    cvKey: {
      type: String,
      required: false
    },
    estadoAnalisis: {
      type: String,
      enum: analysisStatuses,
      default: 'PENDIENTE',
      required: false
    },
    resultadoIa: {
      type: new Schema(
        {
          resumen: { type: String, required: true },
          nota: { type: Number, required: true, min: 1, max: 10 },
          comentarioNota: { type: String, required: true },
          puntosFuertes: { type: [String], required: true },
          experienciaDestacada: { type: [String], required: true }
        },
        { _id: false }
      ),
      required: false
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
