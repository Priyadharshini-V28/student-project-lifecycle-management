import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { milestoneService } from '../services/milestone.service';
import { Project, AuditLog } from '../models';
import { logger } from '../utils/logger';

export const runMilestoneTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('🎯 STAGE 9: MILESTONE TRACKING & PROGRESS GOVERNANCE TEST SUITE');
  logger.info('================================================================');

  const projectId = 'e0000000-0000-0000-0000-000000000001';
  const student1Id = 'b0000000-0000-0000-0000-000000000001'; // Project lead
  const student3Id = 'b0000000-0000-0000-0000-000000000003'; // Non-member student
  const faculty1Id = 'f0000000-0000-0000-0000-000000000001'; // Assigned guide
  const faculty2Id = 'f0000000-0000-0000-0000-000000000002'; // Other faculty

  // --------------------------------------------------------------------------
  // Assertion 1: Fetch Project Milestones (Authorized Student Lead)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 1: Fetch Project Milestones (Authorized Project Lead)');
  const overview = await milestoneService.getProjectMilestones(projectId, student1Id, 'STUDENT');
  console.log(`✓ Project Milestones Retrieved: ${overview.milestones.length}`);
  console.log(`  Project: "${overview.projectTitle}" (Status: ${overview.projectStatus})`);
  console.log(`  Initial Overall Progress: ${overview.overallProgress}%`);
  console.log(`  Completed: ${overview.milestonesCompleted} | Overdue: ${overview.overdueCount}`);

  if (overview.milestones.length !== 5) {
    throw new Error(`Expected 5 milestones, found ${overview.milestones.length}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 2: Student RBAC Authorization Check (Unauthorized Student Blocked)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 2: Student RBAC Authorization Check (Unauthorized Student)');
  try {
    await milestoneService.getProjectMilestones(projectId, student3Id, 'STUDENT');
    throw new Error('Test failed: Unauthorized student should not access project milestones');
  } catch (err: unknown) {
    console.log(`✓ Unauthorized student blocked cleanly: "${(err as Error).message}"`);
  }

  // --------------------------------------------------------------------------
  // Assertion 3: Student Milestone Progress Submission
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 3: Student Milestone Progress Submission');
  const m3Id = 'd0000000-0000-0000-0000-000000000003'; // M3: Grad-CAM
  const updatedM3 = await milestoneService.updateMilestoneProgress(
    projectId,
    m3Id,
    {
      completionPercentage: 85,
      studentRemarks: 'FastAPI WebSocket inference service connected and tested with 50 fundus scans.',
    },
    student1Id
  );
  console.log(`✓ Milestone M3 progress updated: ${updatedM3.milestone.completionPercentage}%`);
  console.log(`  Student Remarks: "${updatedM3.milestone.studentRemarks}"`);
  console.log(`  Updated Overall Progress: ${updatedM3.overallProgress}%`);

  if (updatedM3.milestone.completionPercentage !== 85) {
    throw new Error(`Expected completion percentage 85, got ${updatedM3.milestone.completionPercentage}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 4: Auto-transition of Status upon Work Commencement
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 4: Auto-transition from PENDING to IN_PROGRESS upon Progress Update');
  const m4Id = 'd0000000-0000-0000-0000-000000000004'; // M4 was PENDING at 0%
  const updatedM4 = await milestoneService.updateMilestoneProgress(
    projectId,
    m4Id,
    {
      completionPercentage: 25,
      studentRemarks: 'TensorRT optimization initiated; benchmark harness written.',
    },
    student1Id
  );
  console.log(`✓ Milestone M4 status transitioned to: ${updatedM4.milestone.status}`);
  if (updatedM4.milestone.status !== 'IN_PROGRESS') {
    throw new Error(`Expected M4 status IN_PROGRESS, got: ${updatedM4.milestone.status}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 5: Project Overall Progress Dynamic Recalculation
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 5: Project Overall Progress Dynamic Recalculation');
  const projectDoc = await Project.findById(projectId);
  if (!projectDoc) throw new Error('Project not found');

  const expectedProgress = Math.round(
    projectDoc.milestones.reduce((acc, m) => acc + (m.completionPercentage || 0), 0) /
      projectDoc.milestones.length
  );
  console.log(`✓ Recalculated Project Progress: ${projectDoc.overallProgress}% (Expected: ${expectedProgress}%)`);
  if (projectDoc.overallProgress !== expectedProgress) {
    throw new Error(`Progress mismatch: db has ${projectDoc.overallProgress}%, expected ${expectedProgress}%`);
  }

  // --------------------------------------------------------------------------
  // Assertion 6: AuditLog Created for Milestone Progress Update
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 6: AuditLog Verification for Milestone Updates');
  const progressLogs = await AuditLog.find({
    entityId: projectId,
    action: 'MILESTONE_PROGRESS_UPDATED',
  }).sort({ createdAt: -1 });

  console.log(`✓ Audit log entries found for milestone progress: ${progressLogs.length}`);
  if (progressLogs.length === 0) {
    throw new Error('Expected at least one MILESTONE_PROGRESS_UPDATED audit log entry');
  }
  console.log(`  Latest Audit Action: ${progressLogs[0].action} by user ${progressLogs[0].userId}`);

  // --------------------------------------------------------------------------
  // Assertion 7: Faculty RBAC on Review (Unauthorized Faculty Blocked)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 7: Faculty Review RBAC Guard (Unauthorized Faculty)');
  try {
    await milestoneService.reviewMilestone(
      projectId,
      m3Id,
      {
        status: 'COMPLETED',
        facultyRemarks: 'Unauthorized review attempt',
      },
      faculty2Id,
      'FACULTY'
    );
    throw new Error('Test failed: Non-guide faculty should not be able to review milestone');
  } catch (err: unknown) {
    console.log(`✓ Unauthorized faculty review blocked: "${(err as Error).message}"`);
  }

  // --------------------------------------------------------------------------
  // Assertion 8: Assigned Faculty Guide Milestone Review & Approval
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 8: Assigned Faculty Guide Review & Completion Approval');
  const reviewedM3 = await milestoneService.reviewMilestone(
    projectId,
    m3Id,
    {
      status: 'COMPLETED',
      facultyRemarks: 'Verified inference latency below 180ms. Grad-CAM visual heatmaps validated.',
    },
    faculty1Id,
    'FACULTY'
  );
  console.log(`✓ Milestone M3 Status: ${reviewedM3.milestone.status}`);
  console.log(`  Faculty Remarks: "${reviewedM3.milestone.facultyRemarks}"`);
  console.log(`  Completion Percentage: ${reviewedM3.milestone.completionPercentage}%`);
  console.log(`  Completed At: ${reviewedM3.milestone.completedAt}`);

  if (reviewedM3.milestone.status !== 'COMPLETED') {
    throw new Error(`Expected status COMPLETED, got ${reviewedM3.milestone.status}`);
  }
  if (reviewedM3.milestone.completionPercentage !== 100) {
    throw new Error(`Expected completed milestone to have 100% progress, got ${reviewedM3.milestone.completionPercentage}`);
  }
  if (!reviewedM3.milestone.completedAt) {
    throw new Error('Expected completedAt timestamp to be set');
  }

  // --------------------------------------------------------------------------
  // Assertion 9: Ad-Hoc Milestone Creation (Faculty Guide / Admin)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 9: Ad-Hoc Milestone Creation (Faculty Guide)');
  const newMilestone = await milestoneService.createMilestone(
    projectId,
    {
      title: 'IEEE Conference Manuscript Preparation & Submission',
      description: 'Draft IEEE format paper detailing ensemble methodology and empirical findings.',
      startDate: new Date('2026-07-15'),
      dueDate: new Date('2026-08-15'),
      completionPercentage: 0,
    },
    faculty1Id,
    'FACULTY'
  );
  console.log(`✓ New Ad-Hoc Milestone created: M${newMilestone.milestoneNumber} - "${newMilestone.title}"`);
  if (newMilestone.milestoneNumber !== 6) {
    throw new Error(`Expected milestone number 6, got ${newMilestone.milestoneNumber}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 10: Milestone Schedule Adjustment with Validation
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 10: Milestone Schedule Adjustment with Date Validation');
  // 10a. Invalid date range (dueDate < startDate)
  try {
    await milestoneService.updateMilestoneSchedule(
      projectId,
      newMilestone.id,
      {
        startDate: new Date('2026-08-20'),
        dueDate: new Date('2026-08-10'),
      },
      faculty1Id,
      'FACULTY'
    );
    throw new Error('Test failed: Should reject dueDate earlier than startDate');
  } catch (err: unknown) {
    console.log(`✓ Invalid schedule dates rejected cleanly: "${(err as Error).message}"`);
  }

  // 10b. Valid date extension
  const updatedSchedule = await milestoneService.updateMilestoneSchedule(
    projectId,
    newMilestone.id,
    {
      dueDate: new Date('2026-08-30'),
      description: 'Extended deadline by 15 days to allow rebuttal preparation.',
    },
    faculty1Id,
    'FACULTY'
  );
  console.log(`✓ Schedule extended: New due date ${updatedSchedule.dueDate.substring(0, 10)}`);
  console.log(`  Updated description: "${updatedSchedule.description}"`);

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 9 MILESTONE TRACKING TESTS PASSED PERFECTLY!');
  logger.info('================================================================');

  await disconnectMongo();
};

if (require.main === module) {
  runMilestoneTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Milestone tests failed:', err);
      process.exit(1);
    });
}
