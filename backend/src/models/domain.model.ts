import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export interface IDomain {
  _id?: string;
  name: string;
  description?: string;
  departmentId?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const domainSchema = new Schema<IDomain>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    departmentId: { type: Number, ref: 'Department' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Domain = model<IDomain>('Domain', domainSchema);
