import { z } from 'zod';
import { IRubricCriterionScore, LetterGrade } from '../models/evaluation.model';

export const DEFAULT_RUBRIC_TEMPLATE: IRubricCriterionScore[] = [
  {
    criterionKey: 'technicalImplementation',
    label: 'Technical Implementation & Architecture',
    weight: 30,
    score: 0,
    remarks: '',
  },
  {
    criterionKey: 'documentationQuality',
    label: 'Documentation & Report Quality',
    weight: 25,
    score: 0,
    remarks: '',
  },
  {
    criterionKey: 'innovationProblemSolving',
    label: 'Innovation & Problem Solving',
    weight: 15,
    score: 0,
    remarks: '',
  },
  {
    criterionKey: 'presentationDemonstration',
    label: 'Presentation & Viva Demonstration',
    weight: 15,
    score: 0,
    remarks: '',
  },
  {
    criterionKey: 'testingValidationOutcomes',
    label: 'Testing, Validation & Project Outcomes',
    weight: 15,
    score: 0,
    remarks: '',
  },
];

export const rubricCriterionScoreSchema = z.object({
  criterionKey: z.string().min(2, 'Criterion key is required'),
  label: z.string().min(2, 'Criterion label is required'),
  weight: z
    .number()
    .min(1, 'Criterion weight must be at least 1%')
    .max(100, 'Criterion weight cannot exceed 100%'),
  score: z
    .number()
    .min(0, 'Criterion score must be at least 0')
    .max(100, 'Criterion score cannot exceed 100'),
  remarks: z.string().trim().optional(),
});

export const saveDraftEvaluationSchema = z.object({
  rubricScores: z.array(rubricCriterionScoreSchema).optional(),
  generalFeedback: z.string().trim().optional(),
  recommendations: z.string().trim().optional(),
});

export const submitEvaluationSchema = z
  .object({
    rubricScores: z
      .array(rubricCriterionScoreSchema)
      .min(1, 'Rubric must contain evaluation criteria'),
    generalFeedback: z
      .string()
      .trim()
      .min(5, 'Evaluator feedback must be at least 5 characters'),
    recommendations: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      const totalWeight = data.rubricScores.reduce((sum, item) => sum + item.weight, 0);
      return Math.abs(totalWeight - 100) < 0.01;
    },
    {
      message: 'Rubric criteria weights must sum exactly to 100%',
      path: ['rubricScores'],
    }
  );

export type SaveDraftEvaluationInput = z.infer<typeof saveDraftEvaluationSchema>;
export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;

/**
 * Calculates weighted score and letter grade based on rubric entries
 */
export function calculateRubricTotals(rubricScores: IRubricCriterionScore[]): {
  totalWeightedScore: number;
  letterGrade: LetterGrade;
  isPassed: boolean;
} {
  if (!rubricScores || rubricScores.length === 0) {
    return {
      totalWeightedScore: 0,
      letterGrade: 'RA',
      isPassed: false,
    };
  }

  const rawWeighted = rubricScores.reduce((acc, curr) => {
    return acc + (Number(curr.score || 0) * Number(curr.weight || 0)) / 100;
  }, 0);

  const totalWeightedScore = Math.round(rawWeighted * 100) / 100;

  let letterGrade: LetterGrade = 'RA';
  if (totalWeightedScore >= 90) {
    letterGrade = 'O';
  } else if (totalWeightedScore >= 80) {
    letterGrade = 'A+';
  } else if (totalWeightedScore >= 70) {
    letterGrade = 'A';
  } else if (totalWeightedScore >= 60) {
    letterGrade = 'B+';
  } else if (totalWeightedScore >= 50) {
    letterGrade = 'B';
  } else {
    letterGrade = 'RA';
  }

  const isPassed = totalWeightedScore >= 50;

  return {
    totalWeightedScore,
    letterGrade,
    isPassed,
  };
}
