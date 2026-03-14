import { Schema, model, Types } from 'mongoose';
import { IUser } from './userModel.js'

// TS Contract for the Organization entity
export interface IOrganization {
  _id?: string;
  name: string;
  country: string;
  // An array of User IDs or populated User objects. This allows TypeScript to know that 'users' is part of an Organization
  users: Types.ObjectId[] | IUser[];
}

// Mongoose Schema
const organizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
  country: { type: String, required: true },
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

export const OrganizationModel = model<IOrganization>('Organization', organizationSchema);