import { Schema, model, Types } from 'mongoose';

export interface IMentoringItem {
  type: 'tip' | 'question' | 'task';
  titleKey: string;
  contentKey: string;
  optionsKeys?: string[];
}

export interface IMentoringModule {
  _id?: Types.ObjectId;
  route: 'BUY' | 'SELL';
  titleKey: string;
  descriptionKey: string;
  items: IMentoringItem[];
  order: number;
  duration: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const mentoringItemSchema = new Schema<IMentoringItem>(
  {
    type: {
      type: String,
      enum: ['tip', 'question', 'task'],
      required: true
    },
    titleKey: {
      type: String,
      required: true
    },
    contentKey: {
      type: String,
      required: true
    },
    optionsKeys: [
      {
        type: String
      }
    ]
  },
  { _id: false }
);

const mentoringModuleSchema = new Schema<IMentoringModule>(
  {
    route: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true
    },
    titleKey: {
      type: String,
      required: true
    },
    descriptionKey: {
      type: String,
      required: true
    },
    items: {
      type: [mentoringItemSchema],
      default: []
    },
    order: {
      type: Number,
      required: true
    },
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

mentoringModuleSchema.index({ route: 1, order: 1 }, { unique: true });

export const MentoringModuleModel = model<IMentoringModule>('MentoringModule', mentoringModuleSchema);
