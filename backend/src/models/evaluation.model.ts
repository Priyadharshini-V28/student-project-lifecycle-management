import { Schema, model } from 'mongoose';
import crypto from 'crypto';

export interface IRubricCriterionScore {
  criterionKey: string;
  label: string;
  weight: number;      // e.g. 30 (percentage points, e.g. 30%)
  score: number;       // 0 - 100
  remarks?: string;
}

export type EvaluationStatus = 'DRAFT' | 'SUBMITTED';
export type LetterGrade = 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA';

export interface IEvaluation {
  _id?: string;
  id?: string;
  projectId: string;
  evaluatorId: string;
  status: EvaluationStatus;
  rubricScores: IRubricCriterionScore[];
  totalWeightedScore: number; // 0 - 100
  letterGrade: LetterGrade;
  generalFeedback: string;
  recommendations?: string;
  isPassed: boolean;
  submittedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const rubricCriterionScoreSchema = new Schema<IRubricCriterionScore>(
  {
    criterionKey: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 1, max: 100 },
    score: { type: Number, required: true, min: 0, max: 100 },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const evaluationSchema = new Schema<IEvaluation>(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    projectId: { type: String, ref: 'Project', required: true, unique: true, index: true },
    evaluatorId: { type: String, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED'],
      default: 'DRAFT',
      required: true,
      index: true,
    },
    rubricScores: [rubricCriterionScoreSchema],
    totalWeightedScore: { type: Number, required: true, min: 0, max: 100 },
    letterGrade: {
      type: String,
      enum: ['O', 'A+', 'A', 'B+', 'B', 'RA'],
      required: true,
    },
    generalFeedback: { type: String, required: true, trim: true },
    recommendations: { type: String, trim: true },
    isPassed: { type: Boolean, required: true, default: false },
    submittedAt: { type: Date },
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

evaluationSchema.index({ evaluatorId: 1, status: 1 });

export const EvaluationModel = model<IEvaluation>('Evaluation', evaluationSchema);
export const Evaluation = EvaluationModel;
