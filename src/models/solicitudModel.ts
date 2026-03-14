import { Schema, model, Types } from 'mongoose';

export const accessRequestStatuses = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;

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
