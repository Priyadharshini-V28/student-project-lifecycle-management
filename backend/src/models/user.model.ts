import { Schema, model } from 'mongoose';
import crypto from 'crypto';
import { UserRole } from '../types/auth.types';

export interface IStudentProfile {
  batchId?: number;
  rollNumber?: string;
  semester?: number;
  cgpa?: number;
}

export interface IFacultyProfile {
  employeeId?: string;
  designation?: string;
  specialization?: string;
  maxProjects?: number;
}

export interface IUser {
  _id?: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId?: number;
  isActive?: boolean;
  studentProfile?: IStudentProfile;
  facultyProfile?: IFacultyProfile;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: {
      type: String,
      required: true,
      enum: ['STUDENT', 'FACULTY', 'ADMIN'],
      index: true,
    },
    departmentId: { type: Number, ref: 'Department', index: true },
    isActive: { type: Boolean, default: true },
    studentProfile: {
      batchId: { type: Number, ref: 'AcademicBatch' },
      rollNumber: { type: String, sparse: true, trim: true, index: true },
      semester: { type: Number, min: 1, max: 8 },
      cgpa: { type: Number, min: 0.0, max: 10.0, default: 0.0 },
    },
    facultyProfile: {
      employeeId: { type: String, sparse: true, trim: true, index: true },
      designation: { type: String, trim: true },
      specialization: { type: String, trim: true },
      maxProjects: { type: Number, default: 5, min: 1 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
      },
    },
  }
);

export const User = model<IUser>('User', userSchema);
