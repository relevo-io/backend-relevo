import { Schema, model, Types } from 'mongoose';
/**
 * @openapi
 * components:
 *   schemas:
 *     Mensaje:
 *       type: object
 *       required:
 *         - chat
 *         - sender
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de MongoDB
 *           example: '64f1a2b3c4d5e6f7a8b9c0d5'
 *         chat:
 *           type: string
 *           description: ID del xat (referència a Chat)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         sender:
 *           type: string
 *           description: ID de l'usuari que envia (referència a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         content:
 *           type: string
 *           description: Contingut del missatge
 *           example: 'Hola, com estàs?'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// ─────────────────────────────────────────────
//  INTERFACES
// ─────────────────────────────────────────────

export const MESSAGE_TYPES = ['text', 'image', 'file', 'audio', 'video'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export interface IMensaje {
  _id?: Types.ObjectId;
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  content: string; // Contenido ya sanitizado (XSS-safe). Opcional si hay archivo
  messageType?: MessageType;
  s3Key?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  createdAt?: Date;
  updatedAt?: Date;
  fileUrl?: string; // Virtual dinámico para la URL pre-firmada de lectura (GET)
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
      required: false,
      trim: true,
      maxlength: 2000
    },
    messageType: {
      type: String,
      enum: MESSAGE_TYPES,
      default: 'text'
    },
    s3Key: {
      type: String,
      trim: true
    },
    fileName: {
      type: String,
      trim: true
    },
    fileSize: {
      type: Number
    },
    mimeType: {
      type: String,
      trim: true
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
