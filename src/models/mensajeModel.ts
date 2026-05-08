import { Schema, model, Types } from 'mongoose';

// ─────────────────────────────────────────────
//  INTERFACES
// ─────────────────────────────────────────────

export interface IMensaje {
  _id?: Types.ObjectId;
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;         // Contenido ya sanitizado (XSS-safe)
  createdAt?: Date;
  updatedAt?: Date;
}

// ─────────────────────────────────────────────
//  SCHEMA
// ─────────────────────────────────────────────

const mensajeSchema = new Schema<IMensaje>(
  {
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    }
  },
  {
    timestamps: true
  }
);

// ─────────────────────────────────────────────
//  INDEXES
// ─────────────────────────────────────────────

// Paginación eficiente del historial por cursor temporal
mensajeSchema.index({ chat: 1, createdAt: -1 });

export const MensajeModel = model<IMensaje>('Mensaje', mensajeSchema);
