import { Schema, model, Types } from 'mongoose';

export interface INotificacion {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  data: Record<string, string>;
  isRead: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const notificacionSchema = new Schema<INotificacion>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    type: {
      type: String,
      required: true
    },
    data: {
      type: Map,
      of: String,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const NotificacionModel = model<INotificacion>('Notificacion', notificacionSchema);
