import { Schema, model, Types } from 'mongoose';

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
