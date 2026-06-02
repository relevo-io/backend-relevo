import { Schema, model, Types } from 'mongoose';

export interface IMentoringProgress {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  completedModules: Types.ObjectId[];
  progressPercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const mentoringProgressSchema = new Schema<IMentoringProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      unique: true
    },
    completedModules: [
      {
        type: Schema.Types.ObjectId,
        ref: 'MentoringModule'
      }
    ],
    progressPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

export const MentoringProgressModel = model<IMentoringProgress>('MentoringProgress', mentoringProgressSchema);
