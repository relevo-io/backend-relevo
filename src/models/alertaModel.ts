import { Schema, model, Types } from 'mongoose';
import { revenueRanges } from './ofertaModel.js';

export interface IAlerta {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  revenueRange: string;
  isActive: boolean;
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
    revenueRange: {
      type: String,
      required: true,
      enum: revenueRanges
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const AlertaModel = model<IAlerta>('Alerta', alertaSchema);
