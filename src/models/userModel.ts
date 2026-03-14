import { Schema, model, Types } from 'mongoose';
import { IOrganization } from './organizationModel.js';
import { z } from 'zod';

// TS Contract for the User entity
export interface IUser {
  _id?: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'USER';
  organization: Types.ObjectId | IOrganization; // Can be an ID or a populated Object
}

// User Mongoose schema definition
const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['ADMIN', 'EDITOR', 'USER'], default: 'USER' },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization', required: true }
});

export const UserModel = model<IUser>('User', userSchema);

// User input validation schema
export const userBodySchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.email("Invalid email format"),
  role: z.enum(['ADMIN', 'EDITOR', 'USER']).optional(),
  organization: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Organization ID format")   // Validamos que sea un ID de MongoDB (24 caracteres hex)
});