import { Schema, model, Types } from 'mongoose';

export interface ILocalizedText {
  ca: string;
  es: string;
  en: string;
}

export interface IMentoringItem {
  type: 'tip' | 'question' | 'task';
  title: ILocalizedText;
  text: ILocalizedText;
  options?: ILocalizedText[];
}

export interface IMentoringModule {
  _id?: Types.ObjectId;
  title: ILocalizedText;
  description: ILocalizedText;
  items: IMentoringItem[];
  order: number;
  duration: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const localizedTextSchema = new Schema<ILocalizedText>(
  {
    ca: { type: String, required: true },
    es: { type: String, required: true },
    en: { type: String, required: true }
  },
  { _id: false }
);

const mentoringItemSchema = new Schema<IMentoringItem>(
  {
    type: {
      type: String,
      enum: ['tip', 'question', 'task'],
      required: true
    },
    title: {
      type: localizedTextSchema,
      required: true
    },
    text: {
      type: localizedTextSchema,
      required: true
    },
    options: [
      {
        type: localizedTextSchema
      }
    ]
  },
  { _id: false }
);

const mentoringModuleSchema = new Schema<IMentoringModule>(
  {
    title: {
      type: localizedTextSchema,
      required: true
    },
    description: {
      type: localizedTextSchema,
      required: true
    },
    items: {
      type: [mentoringItemSchema],
      default: []
    },
    order: {
      type: Number,
      required: true,
      unique: true
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

export const MentoringModuleModel = model<IMentoringModule>('MentoringModule', mentoringModuleSchema);
