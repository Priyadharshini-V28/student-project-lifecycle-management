import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export interface IProjectMember {
  _id?: string;
  studentId: string;
  roleInProject: 'LEAD' | 'MEMBER';
  joinedAt?: Date;
}

export interface IMilestone {
  _id?: string;
  milestoneNumber: number;
  title: string;
  description: string;
  startDate: Date;
  dueDate: Date;
  completionPercentage: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  studentRemarks?: string;
  facultyRemarks?: string;
  completedAt?: Date;
}

export interface IFinalEvaluation {
  evaluatorId: string;
  technicalScore: number;
  documentationScore: number;
  presentationScore: number;
  vivaScore: number;
  overallScore: number;
  letterGrade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA';
  finalRemarks: string;
  evaluatedAt?: Date;
}

export interface IProject {
  _id?: string;
  proposalId: string;
  title: string;
  abstract: string;
  domain: string;
  subjectCode?: string;
  subjectName?: string;
  facultyGuideId: string;
  status: 'ALLOCATED' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'EVALUATED' | 'COMPLETED' | 'SUSPENDED' | 'ARCHIVED';
  overallProgress: number;
  repositoryUrl?: string;
  teamMembers: IProjectMember[];
  milestones: IMilestone[];
  finalEvaluation?: IFinalEvaluation;
  createdAt?: Date;
  updatedAt?: Date;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    studentId: { type: String, ref: 'User', required: true },
    roleInProject: { type: String, enum: ['LEAD', 'MEMBER'], default: 'MEMBER' },
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

const milestoneSchema = new Schema<IMilestone>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    milestoneNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    completionPercentage: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'],
      default: 'PENDING',
    },
    studentRemarks: { type: String },
    facultyRemarks: { type: String },
    completedAt: { type: Date },
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

const finalEvaluationSchema = new Schema<IFinalEvaluation>(
  {
    evaluatorId: { type: String, ref: 'User', required: true },
    technicalScore: { type: Number, required: true, min: 0, max: 100 },
    documentationScore: { type: Number, required: true, min: 0, max: 100 },
    presentationScore: { type: Number, required: true, min: 0, max: 100 },
    vivaScore: { type: Number, required: true, min: 0, max: 100 },
    overallScore: { type: Number, required: true },
    letterGrade: {
      type: String,
      enum: ['O', 'A+', 'A', 'B+', 'B', 'RA'],
      required: true,
    },
    finalRemarks: { type: String, required: true },
    evaluatedAt: { type: Date, default: Date.now },
  }
);

const projectSchema = new Schema<IProject>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    proposalId: { type: String, ref: 'Proposal', required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    abstract: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    subjectCode: { type: String, trim: true, default: 'CAPSTONE-01', index: true },
    subjectName: { type: String, trim: true, default: 'Major Capstone Project' },
    facultyGuideId: { type: String, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'EVALUATED', 'COMPLETED', 'SUSPENDED', 'ARCHIVED'],
      default: 'ALLOCATED',
      index: true,
    },
    overallProgress: { type: Number, min: 0, max: 100, default: 0 },
    repositoryUrl: { type: String, trim: true },
    teamMembers: [projectMemberSchema],
    milestones: [milestoneSchema],
    finalEvaluation: finalEvaluationSchema,
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

export const Project = model<IProject>('Project', projectSchema);
