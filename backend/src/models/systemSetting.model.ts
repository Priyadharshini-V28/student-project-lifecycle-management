import { Schema, model } from 'mongoose';

export interface ISystemSetting {
  _id?: string;
  key: string;
  value: string;
  description?: string;
  updatedAt?: Date;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    description: { type: String },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret.key;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const SystemSetting = model<ISystemSetting>('SystemSetting', systemSettingSchema);
