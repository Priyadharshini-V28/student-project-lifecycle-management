import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { evaluationService } from '../services/evaluation.service';
import { Project, Evaluation, DocumentModel, AuditLog, Notification } from '../models';
import { logger } from '../utils/logger';

export const runEvaluationTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('🎓 STAGE 12: FINAL EVALUATION & PROJECT COMPLETION TEST SUITE');
  logger.info('================================================================');

  const projectId = 'e0000000-0000-0000-0000-000000000001';
  const student1Id = 'b0000000-0000-0000-0000-000000000001'; // Project lead
  const student2Id = 'b0000000-0000-0000-0000-000000000002'; // Member
  const faculty1Id = 'f0000000-0000-0000-0000-000000000001'; // Assigned guide
  const faculty2Id = 'f0000000-0000-0000-0000-000000000002'; // Other faculty (unauthorized)
  const adminId = 'a0000000-0000-0000-0000-000000000001';    // Administrator

  // --------------------------------------------------------------------------
  // Assertion 1: Eligibility Pre-check on Initial State (Should be Ineligible)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 1: Eligibility Pre-check on Initial Project State');
  const initialEligibility = await evaluationService.checkEligibility(projectId, faculty1Id, 'FACULTY');
  console.log(`✓ Initial project eligibility: ${initialEligibility.eligible}`);
  console.log(`  Identified reasons: ${initialEligibility.reasons.join(' | ')}`);
  if (initialEligibility.eligible) {
    throw new Error('Project should not be eligible before milestone completion and deliverables upload');
  }
  if (initialEligibility.reasons.length < 2) {
    throw new Error(`Expected at least 2 ineligibility reasons, got ${initialEligibility.reasons.length}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 2: Student Blocked from Submitting / Saving Drafts
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 2: RBAC Guard — Student Blocked from Evaluation Mutations');
  let studentSaveBlocked = false;
  try {
    await evaluationService.saveDraft(
      projectId,
      student1Id,
      { generalFeedback: 'Self evaluation attempt' },
      'STUDENT'
    );
  } catch (err: any) {
    studentSaveBlocked = true;
    console.log(`✓ Student draft save blocked cleanly: "${err.message}"`);
  }
  if (!studentSaveBlocked) {
    throw new Error('Students must not be able to save evaluation drafts');
  }

  // --------------------------------------------------------------------------
  // Assertion 3: Non-Assigned Faculty Blocked from Evaluating Other Projects
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 3: Guide Authorization Guard — Non-assigned Faculty Blocked');
  let unassignedFacultyBlocked = false;
  try {
    await evaluationService.saveDraft(
      projectId,
      faculty2Id,
      { generalFeedback: 'Unauthorized faculty draft' },
      'FACULTY'
    );
  } catch (err: any) {
    unassignedFacultyBlocked = true;
    console.log(`✓ Non-assigned faculty blocked cleanly: "${err.message}"`);
  }
  if (!unassignedFacultyBlocked) {
    throw new Error('Non-assigned faculty must not be allowed to evaluate another faculty’s project');
  }

  // --------------------------------------------------------------------------
  // Assertion 4: Rubric Weight Sum Validation (Must Equal 100%)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 4: Rubric Weight Sum Validation');
  let weightSumValidationFailed = false;
  try {
    await evaluationService.submitEvaluation(
      projectId,
      faculty1Id,
      {
        rubricScores: [
          { criterionKey: 'tech', label: 'Tech', weight: 40, score: 85 },
          { criterionKey: 'doc', label: 'Doc', weight: 40, score: 80 },
          // Sum is 80%, not 100%
        ],
        generalFeedback: 'Invalid weight test',
      },
      'FACULTY'
    );
  } catch (err: any) {
    weightSumValidationFailed = true;
    console.log(`✓ Rubric weights sum validation rejected cleanly: "${err.message}"`);
  }
  if (!weightSumValidationFailed) {
    throw new Error('Evaluation submission must fail when rubric weights do not equal 100%');
  }

  // --------------------------------------------------------------------------
  // Assertion 5: Save Evaluation Draft by Assigned Faculty Guide
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 5: Save Evaluation Draft by Assigned Faculty Guide');
  const draftResult = await evaluationService.saveDraft(
    projectId,
    faculty1Id,
    {
      rubricScores: [
        {
          criterionKey: 'technicalImplementation',
          label: 'Technical Implementation & Architecture',
          weight: 30,
          score: 88,
          remarks: 'Solid Vision Transformer pipeline.',
        },
        {
          criterionKey: 'documentationQuality',
          label: 'Documentation & Report Quality',
          weight: 25,
          score: 84,
          remarks: 'Detailed architectural schemas.',
        },
        {
          criterionKey: 'innovationProblemSolving',
          label: 'Innovation & Problem Solving',
          weight: 15,
          score: 92,
          remarks: 'High novelty in Grad-CAM medical explanations.',
        },
        {
          criterionKey: 'presentationDemonstration',
          label: 'Presentation & Viva Demonstration',
          weight: 15,
          score: 90,
          remarks: 'Good live demonstration.',
        },
        {
          criterionKey: 'testingValidationOutcomes',
          label: 'Testing, Validation & Project Outcomes',
          weight: 15,
          score: 86,
          remarks: 'Tested across 88k fundus images.',
        },
      ],
      generalFeedback: 'Work in progress. Strong empirical groundwork.',
      recommendations: 'Complete final viva presentation slides.',
    },
    'FACULTY'
  );

  const savedDraftDoc = await Evaluation.findOne({ projectId });
  if (!savedDraftDoc || savedDraftDoc.status !== 'DRAFT') {
    throw new Error('Evaluation draft was not saved with status DRAFT');
  }
  console.log(`✓ Draft saved successfully: status=${savedDraftDoc.status}, score=${savedDraftDoc.totalWeightedScore}, grade=${savedDraftDoc.letterGrade}`);

  const draftAudit = await AuditLog.findOne({ action: 'EVALUATION_DRAFT_SAVED', entityId: savedDraftDoc.id });
  if (!draftAudit) {
    throw new Error('Audit log for EVALUATION_DRAFT_SAVED was not recorded');
  }
  console.log(`✓ Audit log verified: action=${draftAudit.action}`);

  // --------------------------------------------------------------------------
  // Assertion 6: Student Privacy Isolation — Draft Hidden from Students
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 6: Student Privacy Isolation (Draft Hidden from Students)');
  const studentEvalView = await evaluationService.getEvaluation(projectId, student1Id, 'STUDENT');
  if (studentEvalView.evaluation !== null || studentEvalView.isReleased) {
    throw new Error('Student was able to see unreleased evaluation draft marks!');
  }
  console.log(`✓ Student evaluation query while DRAFT: status="${studentEvalView.status}", isReleased=${studentEvalView.isReleased}, evaluation=${studentEvalView.evaluation}`);

  // Faculty can see draft
  const facultyEvalView = await evaluationService.getEvaluation(projectId, faculty1Id, 'FACULTY');
  if (!facultyEvalView.evaluation || facultyEvalView.status !== 'DRAFT') {
    throw new Error('Faculty guide should be able to view their own draft');
  }
  console.log(`✓ Faculty guide can view draft: status="${facultyEvalView.status}", totalScore=${facultyEvalView.evaluation.totalWeightedScore}`);

  // --------------------------------------------------------------------------
  // Assertion 7: Fulfill Eligibility Requirements
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 7: Fulfilling Eligibility Prerequisites');
  // Update milestones progress to >= 75%
  await Project.updateOne(
    { _id: projectId },
    {
      $set: {
        overallProgress: 90,
        'milestones.2.status': 'COMPLETED',
        'milestones.2.completionPercentage': 100,
        'milestones.3.status': 'COMPLETED',
        'milestones.3.completionPercentage': 100,
        'milestones.4.status': 'COMPLETED',
        'milestones.4.completionPercentage': 100,
      },
    }
  );

  // Upload required deliverable to document repository
  await DocumentModel.create({
    projectId,
    uploadedBy: student1Id,
    documentType: 'FINAL_THESIS',
    fileName: 'retinopathy_ai_final_thesis.pdf',
    originalFileName: 'final_thesis.pdf',
    filePath: 'uploads/retinopathy_ai_final_thesis.pdf',
    fileSizeBytes: 4500000,
    mimeType: 'application/pdf',
    version: 1,
    remarks: 'Official final thesis report for Capstone defense',
  });

  const fulfilledEligibility = await evaluationService.checkEligibility(projectId, faculty1Id, 'FACULTY');
  console.log(`✓ Project eligibility after prerequisites fulfilled: ${fulfilledEligibility.eligible}`);
  if (!fulfilledEligibility.eligible) {
    throw new Error(`Project should be eligible, reasons: ${fulfilledEligibility.reasons.join(', ')}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 8: Submit Final Evaluation by Faculty Guide
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 8: Submitting Final Project Evaluation');
  const finalRubricScores = [
    {
      criterionKey: 'technicalImplementation',
      label: 'Technical Implementation & Architecture',
      weight: 30,
      score: 92,
      remarks: 'Outstanding Vision Transformer architecture and latency optimization.',
    },
    {
      criterionKey: 'documentationQuality',
      label: 'Documentation & Report Quality',
      weight: 25,
      score: 90,
      remarks: 'Exemplary final thesis document with comprehensive citations.',
    },
    {
      criterionKey: 'innovationProblemSolving',
      label: 'Innovation & Problem Solving',
      weight: 15,
      score: 94,
      remarks: 'Grad-CAM lesion localization demonstrates strong clinical utility.',
    },
    {
      criterionKey: 'presentationDemonstration',
      label: 'Presentation & Viva Demonstration',
      weight: 15,
      score: 88,
      remarks: 'Articulate defense and clear answers to faculty questions.',
    },
    {
      criterionKey: 'testingValidationOutcomes',
      label: 'Testing, Validation & Project Outcomes',
      weight: 15,
      score: 91,
      remarks: 'High quadratic weighted kappa score across benchmark test datasets.',
    },
  ];

  const submitResult = await evaluationService.submitEvaluation(
    projectId,
    faculty1Id,
    {
      rubricScores: finalRubricScores,
      generalFeedback: 'Exemplary project execution and clinical machine learning engineering.',
      recommendations: 'Recommended for institutional conference presentation and publication.',
    },
    'FACULTY'
  );

  console.log(`✓ Final evaluation submitted: status=${submitResult.evaluation.status}, score=${submitResult.evaluation.totalWeightedScore}, grade=${submitResult.evaluation.letterGrade}`);
  if (submitResult.evaluation.status !== 'SUBMITTED' || submitResult.evaluation.letterGrade !== 'O') {
    throw new Error(`Expected SUBMITTED with grade O, got ${submitResult.evaluation.letterGrade}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 9: Project Lifecycle State Transition to COMPLETED
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 9: Project Lifecycle State Transition to COMPLETED');
  const updatedProject = await Project.findById(projectId);
  if (!updatedProject) throw new Error('Project not found');
  console.log(`✓ Project status: ${updatedProject.status} | Progress: ${updatedProject.overallProgress}%`);
  if (updatedProject.status !== 'COMPLETED') {
    throw new Error(`Expected project status COMPLETED, got ${updatedProject.status}`);
  }
  if (updatedProject.overallProgress !== 100) {
    throw new Error(`Expected overallProgress 100, got ${updatedProject.overallProgress}`);
  }
  if (!updatedProject.finalEvaluation || updatedProject.finalEvaluation.letterGrade !== 'O') {
    throw new Error('Project finalEvaluation field was not mirrored correctly');
  }
  console.log(`✓ Project mirrored final evaluation: overallScore=${updatedProject.finalEvaluation.overallScore}, letterGrade=${updatedProject.finalEvaluation.letterGrade}`);

  // --------------------------------------------------------------------------
  // Assertion 10: Student Evaluation Visibility, Notifications & Immutability
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 10: Student Visibility, Audit Log, and Notifications');
  const studentFinalView = await evaluationService.getEvaluation(projectId, student1Id, 'STUDENT');
  if (!studentFinalView.isReleased || !studentFinalView.evaluation) {
    throw new Error('Student should now be able to view their released final evaluation');
  }
  console.log(`✓ Student can view released evaluation: score=${studentFinalView.evaluation.totalWeightedScore}, grade=${studentFinalView.evaluation.letterGrade}, feedback="${studentFinalView.evaluation.generalFeedback}"`);

  // Verify Audit Log
  const submitAudit = await AuditLog.findOne({ action: 'FINAL_EVALUATION_SUBMITTED', entityId: submitResult.evaluation.id });
  if (!submitAudit) {
    throw new Error('Audit log for FINAL_EVALUATION_SUBMITTED was not recorded');
  }
  console.log(`✓ Submission audit log verified: action=${submitAudit.action}, userId=${submitAudit.userId}`);

  // Verify In-App Notifications
  const student1Notif = await Notification.findOne({ recipientId: student1Id, type: 'PROJECT_EVALUATION' });
  const student2Notif = await Notification.findOne({ recipientId: student2Id, type: 'PROJECT_EVALUATION' });
  if (!student1Notif || !student2Notif) {
    throw new Error('Notifications were not delivered to all student team members');
  }
  console.log(`✓ Student 1 received evaluation notification: "${student1Notif.title}" — "${student1Notif.message}"`);
  console.log(`✓ Student 2 received evaluation notification: "${student2Notif.title}" — "${student2Notif.message}"`);

  // Verify Duplicate Prevention / Immutability
  let reSubmitBlocked = false;
  try {
    await evaluationService.submitEvaluation(
      projectId,
      faculty1Id,
      {
        rubricScores: finalRubricScores,
        generalFeedback: 'Attempted modification after submission',
      },
      'FACULTY'
    );
  } catch (err: any) {
    reSubmitBlocked = true;
    console.log(`✓ Duplicate final evaluation submission blocked: "${err.message}"`);
  }
  if (!reSubmitBlocked) {
    throw new Error('Re-submitting an already finalized evaluation must be blocked');
  }

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 12 FINAL EVALUATION & COMPLETION TESTS PASSED!');
  logger.info('================================================================');

  await disconnectMongo();
};

if (require.main === module) {
  runEvaluationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Stage 12 Evaluation test suite failed:', err);
      process.exit(1);
    });
}
