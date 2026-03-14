import { Schema, model, Types } from 'mongoose';

export const userRoles = ['OWNER', 'INTERESTED'] as const;

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
    ]
  },
  {
    timestamps: true
  }
);

export const Usuario = model<IUsuario>('Usuario', usuarioSchema);
