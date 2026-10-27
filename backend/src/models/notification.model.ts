import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export type NotificationType =
  | 'PROPOSAL_SUBMITTED'
  | 'PROPOSAL_RESUBMITTED'
  | 'PROPOSAL_APPRAISED'
  | 'PROPOSAL_CHANGES_REQUESTED'
  | 'PROPOSAL_APPROVED'
  | 'PROPOSAL_REJECTED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_REVISED'
  | 'MILESTONE_UPDATED'
  | 'MILESTONE_REVIEWED'
  | 'MILESTONE_OVERDUE'
  | 'DEADLINE_APPROACHING'
  | 'PROJECT_EVALUATION'
  | 'PROJECT_COMPLETED'
  | 'SYSTEM_ALERT';

export interface INotification {
  _id?: string;
  id?: string;
  recipientId: string;
  userId?: string; // Kept for backwards compatibility
  title: string;
  message: string;
  type: NotificationType | string;
  projectId?: string;
  proposalId?: string;
  documentId?: string;
  reviewId?: string;
  milestoneId?: string;
  link?: string;
  isRead: boolean;
  readAt?: Date;
  idempotencyKey?: string;
  createdAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    recipientId: { type: String, ref: 'User', required: true },
    userId: { type: String, ref: 'User' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    projectId: { type: String, ref: 'Project' },
    proposalId: { type: String, ref: 'Proposal' },
    documentId: { type: String, ref: 'Document' },
    reviewId: { type: String, ref: 'Review' },
    milestoneId: { type: String },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    idempotencyKey: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        ret.userId = ret.recipientId;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Pre-validate hook to sync recipientId and userId
notificationSchema.pre('validate', function () {
  if (!this.recipientId && this.userId) {
    this.recipientId = this.userId;
  }
  if (!this.userId && this.recipientId) {
    this.userId = this.recipientId;
  }
});

// Indexes for fast querying, unread count resolution, and chronological sorting
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const NotificationModel = model<INotification>('Notification', notificationSchema);
export const Notification = NotificationModel;
