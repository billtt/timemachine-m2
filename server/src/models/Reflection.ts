import mongoose, { Document, Schema } from 'mongoose';

export interface IReflectionQuestion {
  id: string;
  text: string;
  order: number;
  answer: string; // encrypted or plaintext (mirrors how slices store content)
}

export interface IReflection extends Document {
  user: string;
  date: string; // yyyy-MM-dd local date, consistent with client date picker
  questions: IReflectionQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const reflectionQuestionSchema = new Schema<IReflectionQuestion>(
  {
    id: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    order: { type: Number, required: true, default: 0 },
    answer: { type: String, required: false, default: '', maxlength: 5000 }
  },
  { _id: false }
);

const reflectionSchema = new Schema<IReflection>(
  {
    user: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    questions: {
      type: [reflectionQuestionSchema],
      default: []
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      }
    }
  }
);

// One reflection per user per date
reflectionSchema.index({ user: 1, date: 1 }, { unique: true });

export const Reflection = mongoose.model<IReflection>('Reflection', reflectionSchema);
