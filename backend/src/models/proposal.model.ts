import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export interface IProposalMember {
  _id?: string;
  studentId: string;
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED';
  isLead: boolean;
  joinedAt?: Date;
}

export interface IProposal {
  _id?: string;
  title: string;
  abstract: string;
  domain: string;
  techStack: string[];
  submittedBy: string;
  assignedFacultyId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  facultyComments?: string | null;
  version: number;
  academicYear: string;
  members: IProposalMember[];
  projectId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const proposalMemberSchema = new Schema<IProposalMember>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    studentId: { type: String, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['INVITED', 'ACCEPTED', 'DECLINED'],
      default: 'ACCEPTED',
    },
    isLead: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now },
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

const proposalSchema = new Schema<IProposal>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    title: { type: String, required: true, trim: true },
    abstract: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    techStack: [{ type: String, trim: true }],
    submittedBy: { type: String, ref: 'User', required: true, index: true },
    assignedFacultyId: { type: String, ref: 'User', index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'],
      default: 'DRAFT',
      index: true,
    },
    facultyComments: { type: String },
    version: { type: Number, default: 1 },
    academicYear: { type: String, default: '2025-2026' },
    members: [proposalMemberSchema],
    projectId: { type: String, ref: 'Project', index: true },
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

export const Proposal = model<IProposal>('Proposal', proposalSchema);
