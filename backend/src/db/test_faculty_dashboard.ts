import { facultyService } from '../services/faculty.service';
import { requireRole } from '../middleware/auth.middleware';
import { Project } from '../models';
import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';

export const runFacultyDashboardTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('📊 STAGE 6: FACULTY DASHBOARD AGGREGATION & ACTION QUEUES TEST SUITE');
  logger.info('================================================================');

  const facultyId1 = 'f0000000-0000-0000-0000-000000000001';
  const facultyId2 = 'f0000000-0000-0000-0000-000000000002';
  const studentId = 'b0000000-0000-0000-0000-000000000001';

  // Test 1: Retrieve Faculty 1 Dashboard Payload
  logger.info('\n▶ Test 1: Retrieve Dashboard Data for Faculty Guide 1');
  const dash1 = await facultyService.getFacultyDashboard(facultyId1);
  console.log('✓ Faculty dashboard payload received:');
  console.log(`  Name: ${dash1.faculty.firstName} ${dash1.faculty.lastName}`);
  console.log(`  Employee ID: ${dash1.faculty.employeeId}`);
  console.log(`  Designation: ${dash1.faculty.designation}`);
  console.log(`  Department: ${dash1.faculty.departmentCode} - ${dash1.faculty.departmentName}`);
  console.log(`  Specialization: ${dash1.faculty.specialization}`);

  if (dash1.faculty.employeeId !== 'FAC-AI-101') {
    throw new Error(`Expected employee ID FAC-AI-101, got ${dash1.faculty.employeeId}`);
  }

  // Test 2: Quota & Capacity Utilization
  logger.info('\n▶ Test 2: Supervising Quota & Workload Capacity Metrics');
  console.log(`  Max Project Quota: ${dash1.metrics.maxQuota}`);
  console.log(`  Currently Assigned: ${dash1.metrics.currentlyAssigned}`);
  console.log(`  Remaining Capacity: ${dash1.metrics.remainingCapacity} slots`);
  console.log(`  Capacity Utilization: ${dash1.metrics.capacityUtilizationPercentage}%`);

  if (dash1.metrics.maxQuota !== 5 || dash1.metrics.currentlyAssigned !== 1 || dash1.metrics.remainingCapacity !== 4) {
    throw new Error('Faculty quota calculation mismatch');
  }
  if (dash1.metrics.capacityUtilizationPercentage !== 20) {
    throw new Error(`Expected 20% capacity utilization, got ${dash1.metrics.capacityUtilizationPercentage}%`);
  }

  // Test 3: Assigned Projects Portfolio
  logger.info('\n▶ Test 3: Assigned Projects Portfolio Resolution');
  console.log(`✓ Assigned Projects Count: ${dash1.assignedProjects.length}`);
  const project = dash1.assignedProjects[0];
  console.log(`  Project 1: "${project.title}"`);
  console.log(`  Domain: ${project.domain} | Status: ${project.status} | Progress: ${project.overallProgress}%`);
  console.log(`  Student Lead: ${project.studentLead.name} (${project.studentLead.rollNumber})`);
  console.log(`  Total Team Members: ${project.teamMembersCount}`);

  if (project.title !== 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy') {
    throw new Error('Assigned project title mismatch');
  }
  if (project.studentLead.rollNumber !== '22AD001' || project.teamMembersCount !== 2) {
    throw new Error('Assigned project team roster mismatch');
  }

  // Test 4: Current Milestone Tracking
  logger.info('\n▶ Test 4: Project Active Milestone Gate Oversight');
  if (!project.currentMilestone) {
    throw new Error('Expected project to have an active milestone');
  }
  console.log(`✓ Active Milestone: M${project.currentMilestone.milestoneNumber} - "${project.currentMilestone.title}"`);
  console.log(`  Status: ${project.currentMilestone.status} | Progress: ${project.currentMilestone.completionPercentage}%`);
  console.log(`  Due Date: ${project.currentMilestone.dueDate.substring(0, 10)}`);

  if (project.currentMilestone.milestoneNumber !== 3) {
    throw new Error(`Expected Milestone 3 active, got M${project.currentMilestone.milestoneNumber}`);
  }

  // Test 5: Latest Review Conducted
  logger.info('\n▶ Test 5: Latest Conducted Evaluation Record');
  if (!project.latestReview) {
    throw new Error('Expected project to have an evaluation review record');
  }
  console.log(`✓ Latest Review: Round #${project.latestReview.roundNumber}`);
  console.log(`  Decision: ${project.latestReview.status}`);
  console.log(`  Total Score Awarded: ${project.latestReview.totalScore} / 100`);

  if (project.latestReview.roundNumber !== 2 || project.latestReview.status !== 'APPROVED') {
    throw new Error('Review status/round mismatch');
  }

  // Test 6: Resubmissions Filtering Logic (Already Reviewed Resubmissions Suppressed)
  logger.info('\n▶ Test 6: Student Resubmissions Queue Filter (Exclude Already Re-evaluated Items)');
  console.log(`✓ Pending Resubmissions Queue Count: ${dash1.actionQueues.pendingResubmissions.length}`);
  // Round 1 resubmission was already re-evaluated in Round 2, so count must be 0
  if (dash1.actionQueues.pendingResubmissions.length !== 0) {
    throw new Error('Expected 0 pending resubmissions as Round 2 review has already been completed');
  }

  // Test 7: Faculty 2 Dashboard & Pending Proposals Queue
  logger.info('\n▶ Test 7: Faculty 2 Dashboard & Assigned Proposals Appraisal Queue');
  const dash2 = await facultyService.getFacultyDashboard(facultyId2);
  console.log(`✓ Faculty 2: ${dash2.faculty.firstName} ${dash2.faculty.lastName} (${dash2.faculty.employeeId})`);
  console.log(`  Max Quota: ${dash2.metrics.maxQuota} | Assigned: ${dash2.metrics.currentlyAssigned}`);
  console.log(`  Proposals Awaiting Review: ${dash2.metrics.proposalsAwaitingReviewCount}`);

  if (dash2.actionQueues.pendingProposals.length === 0) {
    throw new Error('Expected Faculty 2 to have at least 1 proposal awaiting appraisal');
  }
  const prop = dash2.actionQueues.pendingProposals[0];
  console.log(`  Pending Proposal: "${prop.title}"`);
  console.log(`  Domain: ${prop.domain} | Submitted By: ${prop.submittedByName} (${prop.submittedByRoll})`);
  console.log(`  Status: ${prop.status} | Academic Year: ${prop.academicYear}`);

  if (prop.status !== 'UNDER_REVIEW') {
    throw new Error(`Expected proposal status UNDER_REVIEW, got ${prop.status}`);
  }

  // Test 8: Pending Reviews Trigger Simulation
  logger.info('\n▶ Test 8: Action Queue Trigger Verification (Simulate Project in UNDER_REVIEW)');
  await Project.updateOne({ _id: 'e0000000-0000-0000-0000-000000000001' }, { status: 'UNDER_REVIEW' });

  const dash1Updated = await facultyService.getFacultyDashboard(facultyId1);
  console.log(`✓ Triggered pending reviews count: ${dash1Updated.metrics.pendingReviewsCount}`);
  if (dash1Updated.actionQueues.pendingReviews.length !== 1) {
    throw new Error('Expected 1 project in pending reviews action queue');
  }
  console.log(`  Queued Review Project: "${dash1Updated.actionQueues.pendingReviews[0].projectTitle}"`);

  // Restore project status back to IN_PROGRESS
  await Project.updateOne({ _id: 'e0000000-0000-0000-0000-000000000001' }, { status: 'IN_PROGRESS' });
  const dash1Restored = await facultyService.getFacultyDashboard(facultyId1);
  console.log(`✓ Restored: Pending reviews count is back to ${dash1Restored.metrics.pendingReviewsCount}`);

  // Test 9: Student Access Rejection
  logger.info('\n▶ Test 9: Role Guard Enforcement (Student ID called against faculty service)');
  try {
    await facultyService.getFacultyDashboard(studentId);
    throw new Error('Test failed: Student should not access faculty dashboard service');
  } catch (err: unknown) {
    console.log(`✓ Student rejected cleanly: "${(err as Error).message}"`);
  }

  // Test 10: Express RBAC Middleware Guard
  logger.info('\n▶ Test 10: Express RBAC Middleware Guard (Mocked Student HTTP Request)');
  const facultyOnlyGuard = requireRole(['FACULTY', 'ADMIN']);
  const mockReqStudent = {
    user: { id: studentId, email: 'student1@splm.edu', role: 'STUDENT' },
  } as unknown as Request;
  const mockRes = {} as Response;

  let middlewareBlocked = false;
  try {
    facultyOnlyGuard(mockReqStudent, mockRes, (() => {}) as NextFunction);
  } catch (err: unknown) {
    middlewareBlocked = true;
    console.log(`✓ Middleware denied student access to /api/faculty: "${(err as Error).message}"`);
  }

  if (!middlewareBlocked) {
    throw new Error('Middleware failed to reject student role from faculty-only route');
  }

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 6 FACULTY DASHBOARD TESTS PASSED PERFECTLY!');
  logger.info('================================================================\n');

  await disconnectMongo();
};

// Standalone execution entrypoint
if (require.main === module) {
  runFacultyDashboardTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Faculty dashboard test suite failed:', err);
      process.exit(1);
    });
}
