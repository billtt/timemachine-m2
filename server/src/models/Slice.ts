import mongoose, { Document, Schema } from 'mongoose';
import { SliceType, SLICE_TYPES } from '../types/shared';

export interface ISlice extends Document {
  content: string;
  type: SliceType;
  user: mongoose.Types.ObjectId;
  time: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sliceSchema = new Schema<ISlice>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 1000
    },
    type: {
      type: String,
      required: true,
      enum: SLICE_TYPES,
      default: 'other'
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    time: {
      type: Date,
      required: true,
      default: Date.now
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

// Indexes for performance
sliceSchema.index({ user: 1, time: -1 });
sliceSchema.index({ user: 1, type: 1 });
sliceSchema.index({ user: 1, createdAt: -1 });
sliceSchema.index({ content: 'text' });

// Methods
sliceSchema.methods.toJSON = function() {
  const slice = this.toObject();
  slice.id = slice._id;
  delete slice._id;
  delete slice.__v;
  return slice;
};

export const Slice = mongoose.model<ISlice>('Slice', sliceSchema);