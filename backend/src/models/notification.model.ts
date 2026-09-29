import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export interface INotification {
  _id?: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    userId: { type: String, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    link: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

export const Notification = model<INotification>('Notification', notificationSchema);
