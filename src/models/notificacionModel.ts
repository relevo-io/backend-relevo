import { Schema, model, Types } from 'mongoose';

/**
 * @openapi
 * components:
 *   schemas:
 *     Notificacion:
 *       type: object
 *       required:
 *         - userId
 *         - title
 *         - body
 *         - type
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de MongoDB
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         userId:
 *           type: string
 *           description: ID del destinatario de la notificación (referencia a Usuario)
 *           example: '64f1a2b3c4d5e6f7a8b9c0d2'
 *         title:
 *           type: string
 *           description: Título de la notificación
 *           example: 'Nuevo mensaje de Pol Puig'
 *         body:
 *           type: string
 *           description: Cuerpo o contenido del mensaje de la notificación
 *           example: 'Hola, ¿sigue disponible el negocio?'
 *         type:
 *           type: string
 *           enum: [chat, solicitud, cv_analysis]
 *           description: Categoría/Tipo de notificación
 *           example: 'chat'
 *         metadata:
 *           type: object
 *           description: Metadatos adicionales para navegación o contextualización
 *           additionalProperties:
 *             type: string
 *           example:
 *             chatId: '64f1a2b3c4d5e6f7a8b9c0d4'
 *             click_action: '/chats/64f1a2b3c4d5e6f7a8b9c0d4'
 *         read:
 *           type: boolean
 *           description: Estado de lectura de la notificación
 *           default: false
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Fecha de creación y punto de partida de la expiración TTL de 30 días
 *           example: '2026-06-09T15:34:47.000Z'
 */

// ─────────────────────────────────────────────
//  INTERFACES
// ─────────────────────────────────────────────

export interface INotificacion {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  body: string;
  type: 'chat' | 'solicitud' | 'cv_analysis';
  metadata?: Record<string, string>;
  read: boolean;
  createdAt?: Date;
}

// ─────────────────────────────────────────────
//  SCHEMA
// ─────────────────────────────────────────────

const notificacionSchema = new Schema<INotificacion>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['chat', 'solicitud', 'cv_analysis'],
    required: true
  },
  metadata: {
    type: Map,
    of: String
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60 // 30 días en segundos (Estrategia 1)
  }
});

// ─────────────────────────────────────────────
//  INDEXES
// ─────────────────────────────────────────────

// Índice para listar notificaciones ordenadas por fecha para cada usuario
notificacionSchema.index({ userId: 1, createdAt: -1 });

export const NotificacionModel = model<INotificacion>('Notificacion', notificacionSchema);
