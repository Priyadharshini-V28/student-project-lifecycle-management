import { Schema, model } from 'mongoose';

export interface IAcademicBatch {
  _id: number;
  departmentId: number;
  name: string;
  startYear: number;
  endYear: number;
  isActive: boolean;
  createdAt?: Date;
}

const batchSchema = new Schema<IAcademicBatch>(
  {
    _id: { type: Number, required: true },
    departmentId: { type: Number, ref: 'Department', required: true, index: true },
    name: { type: String, required: true, trim: true },
    startYear: { type: Number, required: true },
    endYear: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret.__v;
      },
    },
  }
);

export const AcademicBatch = model<IAcademicBatch>('AcademicBatch', batchSchema);
