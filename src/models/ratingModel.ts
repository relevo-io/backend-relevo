import { Schema, model, Types } from 'mongoose';

export const ratingRoles = ['OWNER', 'INTERESTED'] as const;
export type RatingRole = (typeof ratingRoles)[number];

export interface IRating {
  _id?: Types.ObjectId;
  chat: Types.ObjectId;
  fromUser: Types.ObjectId;
  toUser: Types.ObjectId;
  ratedRole: RatingRole;
  score: number;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ratingSchema = new Schema<IRating>(
  {
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    fromUser: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    toUser: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    ratedRole: { type: String, enum: ratingRoles, required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 600 }
  },
  { timestamps: true }
);

ratingSchema.index({ chat: 1, fromUser: 1 }, { unique: true, name: 'uniq_rating_chat_from_user' });
ratingSchema.index({ toUser: 1, ratedRole: 1, createdAt: -1 });

export const RatingModel = model<IRating>('Rating', ratingSchema);
