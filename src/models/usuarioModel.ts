import { Schema, model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

import { config } from '../config.js';

export const userRoles = ['OWNER', 'INTERESTED', 'ADMIN'] as const;
export const authProviders = ['local', 'google', 'github'] as const;

const SALT_ROUNDS = config.bcryptSaltRounds;

const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

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
 *         - roles
 *       properties:
 *         _id:
 *           type: string
 *           readOnly: true
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
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *             enum: [OWNER, INTERESTED, ADMIN]
 *           minItems: 1
 *           maxItems: 2
 *           example: ['INTERESTED']
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
 *         cv:
 *           type: string
 *           maxLength: 4000
 *           example: 'Experiencia en gestion operativa, liderazgo y expansion comercial.'
 *         preferredRegions:
 *           type: array
 *           items:
 *             type: string
 *         visible:
 *           type: boolean
 *           default: true
 *           example: true
 *         language:
 *           type: string
 *           enum: [es, ca, en]
 *           default: es
 *           example: 'ca'
 *         theme:
 *           type: string
 *           enum: [light, dark]
 *           default: light
 *           example: 'light'
 *         createdAt:
 *           type: string
 *           readOnly: true
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           readOnly: true
 *           format: date-time
 */
export interface IUsuario {
  _id?: Types.ObjectId;
  roles: Array<(typeof userRoles)[number]>;
  fullName: string;
  email: string;
  password?: string | null;
  authProvider?: (typeof authProviders)[number];
  providerId?: string | null;
  favoriteOfferIds?: Types.ObjectId[];
  location?: string;
  bio?: string;
  professionalBackground?: string;
  cv?: string;
  preferredRegions?: string[];
  visible?: boolean;
  language?: string;
  theme?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const usuarioSchema = new Schema<IUsuario>(
  {
    roles: {
      type: [String],
      enum: userRoles,
      required: true,
      validate: [
        {
          validator: (roles: string[]) => Array.isArray(roles) && roles.length >= 1 && roles.length <= 2,
          message: 'Debe contener entre 1 y 2 roles'
        },
        {
          validator: (roles: string[]) => new Set(roles).size === roles.length,
          message: 'No se permiten roles duplicados'
        }
      ]
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
      required: false,
      minlength: 6
    },
    authProvider: {
      type: String,
      enum: authProviders,
      default: 'local',
      required: true
    },
    providerId: {
      type: String,
      default: null,
      sparse: true
    },
    favoriteOfferIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Oferta' }],
      default: []
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
    cv: {
      type: String,
      required: false,
      maxlength: 4000,
      trim: true
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
    },
    language: {
      type: String,
      enum: ['es', 'ca', 'en'],
      default: 'es'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    }
  },
  {
    timestamps: true
  }
);

usuarioSchema.pre('save', async function () {
  if (this.authProvider === 'local' && !this.password) {
    throw new Error('El password es obligatorio para cuentas locales');
  }

  if (this.authProvider !== 'local' && !this.password) {
    this.password = null;
    return;
  }

  if (!this.isModified('password')) {
    return;
  }

  if (!this.password) {
    return;
  }

  this.password = await hashPassword(this.password);
});

usuarioSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) {
    return;
  }

  const typedUpdate = update as {
    password?: string;
    $set?: {
      password?: string;
    };
  };

  const plainPassword = typedUpdate.$set?.password ?? typedUpdate.password;
  if (!plainPassword) {
    return;
  }

  const hashedPassword = await hashPassword(plainPassword);
  if (typedUpdate.$set?.password) {
    typedUpdate.$set.password = hashedPassword;
    return;
  }

  typedUpdate.password = hashedPassword;
});

usuarioSchema.index(
  { authProvider: 1, providerId: 1 },
  { unique: true, partialFilterExpression: { providerId: { $type: 'string' } } }
);

export const UsuarioModel = model<IUsuario>('Usuario', usuarioSchema);
