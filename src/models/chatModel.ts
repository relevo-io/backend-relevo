import { Schema, model, Types } from 'mongoose';
/**
 * @openapi
 * components:
 *   schemas:
 *     Chat:
 *       type: object
 *       required:
 *         - oferta
 *         - owner
 *         - interested
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de MongoDB
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         oferta:
 *           type: string
 *           description: ID de l'oferta (referència a Oferta)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d3'
 *         owner:
 *           type: string
 *           description: ID del propietari de l'oferta (referència a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         interested:
 *           type: string
 *           description: ID de l'usuari interessat (referència a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d2'
 *         lastMessage:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *             senderId:
 *               type: string
 *             sentAt:
 *               type: string
 *               format: date-time
 *         unreadOwner:
 *           type: number
 *           default: 0
 *         unreadInterested:
 *           type: number
 *           default: 0
 *         isReadOnly:
 *           type: boolean
 *           default: false
 *         status:
 *           type: string
 *           enum: [PENDING_APPROVAL, APPROVED, REJECTED]
 *           default: PENDING_APPROVAL
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

export interface ILastMessage {
  content: string;
  senderId: Types.ObjectId;
  sentAt: Date;
}

export type ChatStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface IChat {
  _id?: Types.ObjectId;
  oferta: Types.ObjectId; // Oferta a la que pertenece el chat
  owner: Types.ObjectId; // Propietario de la oferta
  interested: Types.ObjectId; // Usuario interesado
  lastMessage?: ILastMessage; // Cache del último mensaje (evita queries extra)
  unreadOwner: number; // Mensajes no leídos por el owner
  unreadInterested: number; // Mensajes no leídos por el interested
  isReadOnly: boolean; // true si la oferta fue eliminada/finalizada
  status: ChatStatus; // Estado de aprobación del chat
  createdAt?: Date;
  updatedAt?: Date;
}

// ─────────────────────────────────────────────
//  SCHEMA
// ─────────────────────────────────────────────

const lastMessageSchema = new Schema<ILastMessage>(
  {
    content: { type: String, required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    sentAt: { type: Date, required: true }
  },
  { _id: false }
);

const chatSchema = new Schema<IChat>(
  {
    oferta: {
      type: Schema.Types.ObjectId,
      ref: 'Oferta',
      required: true
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    interested: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true
    },
    lastMessage: {
      type: lastMessageSchema,
      required: false
    },
    unreadOwner: {
      type: Number,
      default: 0,
      min: 0
    },
    unreadInterested: {
      type: Number,
      default: 0,
      min: 0
    },
    isReadOnly: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
      default: 'APPROVED'
    }
  },
  {
    timestamps: true
  }
);

// ─────────────────────────────────────────────
//  INDEXES
// ─────────────────────────────────────────────

// Un solo chat por par oferta+interesado (mismo patrón que Solicitud)
chatSchema.index({ oferta: 1, interested: 1 }, { unique: true, name: 'uniq_oferta_interested' });

// Consultas rápidas de "mis chats" (owner o interested)
chatSchema.index({ owner: 1, updatedAt: -1 });
chatSchema.index({ interested: 1, updatedAt: -1 });

export const ChatModel = model<IChat>('Chat', chatSchema);
