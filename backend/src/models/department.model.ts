import { Schema, model } from 'mongoose';

export interface IDepartment {
  _id: number;
  code: string;
  name: string;
  createdAt?: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    _id: { type: Number, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
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

export const Department = model<IDepartment>('Department', departmentSchema);
