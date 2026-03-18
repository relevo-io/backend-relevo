import { Schema, model, Types } from 'mongoose';

export const userRoles = ['OWNER', 'INTERESTED'] as const;

/**
 * @openapi
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *         - role
 *       properties:
 *         _id:
 *           type: string
 *           description: ID autogenerado de MongoDB
 *           example: '64f1a2b3c4d5e6f7a8b9c0d1'
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 120
 *           example: 'Juan Pérez'
 *         email:
 *           type: string
 *           format: email
 *           example: 'juan@relevo.io'
 *         password:
 *           type: string
 *           minLength: 6
 *           format: password
 *           example: '********'
 *         role:
 *           type: string
 *           enum: [OWNER, INTERESTED]
 *           example: 'INTERESTED'
 *         location:
 *           type: string
 *           maxLength: 120
 *           example: 'Barcelona'
 *         bio:
 *           type: string
 *           maxLength: 500
 *           example: 'Emprendedor enfocado en sostenibilidad'
 *         professionalBackground:
 *           type: string
 *           maxLength: 2000
 *         preferredRegions:
 *           type: array
 *           items:
 *             type: string
 *         visible:
 *           type: boolean
 *           default: true
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export interface IUsuario {
  _id?: Types.ObjectId;
  role: (typeof userRoles)[number];
  fullName: string;
  email: string;
  password: string;
  location?: string;
  bio?: string;
  professionalBackground?: string;
  preferredRegions?: string[];
  visible?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const usuarioSchema = new Schema<IUsuario>(
  {
    role: {
      type: String,
      enum: userRoles,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    location: {
      type: String,
      required: false,
      trim: true,
      maxlength: 120
    },
    bio: {
      type: String,
      required: false,
      maxlength: 500
    },
    professionalBackground: {
      type: String,
      required: false,
      maxlength: 2000
    },
    preferredRegions: [
      {
        type: String,
        trim: true
      }
    ],
    visible: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const UsuarioModel = model<IUsuario>('Usuario', usuarioSchema);
