import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export interface IReviewResubmission {
  _id?: string;
  resubmittedBy: string;
  studentNotes: string;
  attachedDocumentIds?: string[];
  resubmittedAt?: Date;
}

export interface IReview {
  _id?: string;
  projectId: string;
  facultyId: string;
  reviewTitle: string;
  roundNumber: number;
  reviewDate: Date;
  generalFeedback: string;
  strengths?: string;
  issuesIdentified?: string;
  requiredChanges?: string;
  hasMarks: boolean;
  technicalScore?: number;
  documentationScore?: number;
  presentationScore?: number;
  totalScore?: number;
  status: 'APPROVED' | 'CHANGES_REQUESTED' | 'IN_PROGRESS';
  resubmissions: IReviewResubmission[];
  createdAt?: Date;
}

const reviewResubmissionSchema = new Schema<IReviewResubmission>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    resubmittedBy: { type: String, ref: 'User', required: true },
    studentNotes: { type: String, required: true },
    attachedDocumentIds: [{ type: String, ref: 'Document' }],
    resubmittedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

const reviewSchema = new Schema<IReview>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    projectId: { type: String, ref: 'Project', required: true, index: true },
    facultyId: { type: String, ref: 'User', required: true, index: true },
    reviewTitle: { type: String, required: true, trim: true },
    roundNumber: { type: Number, required: true, default: 1 },
    reviewDate: { type: Date, required: true, default: Date.now },
    generalFeedback: { type: String, required: true },
    strengths: { type: String },
    issuesIdentified: { type: String },
    requiredChanges: { type: String },
    hasMarks: { type: Boolean, default: false },
    technicalScore: { type: Number, min: 0, max: 100 },
    documentationScore: { type: Number, min: 0, max: 100 },
    presentationScore: { type: Number, min: 0, max: 100 },
    totalScore: { type: Number },
    status: {
      type: String,
      enum: ['APPROVED', 'CHANGES_REQUESTED', 'IN_PROGRESS'],
      required: true,
      index: true,
    },
    resubmissions: [reviewResubmissionSchema],
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

reviewSchema.index({ projectId: 1, roundNumber: -1 });

export const Review = model<IReview>('Review', reviewSchema);
