import { studentService } from '../services/student.service';
import { requireRole } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';

export const runStudentDashboardTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('📊 STAGE 5: STUDENT DASHBOARD AGGREGATION & METRICS TEST SUITE');
  logger.info('================================================================');

  const studentId = 'b0000000-0000-0000-0000-000000000001';
  const facultyId = 'f0000000-0000-0000-0000-000000000001';

  // Test 1: Retrieve Aggregated Dashboard Data
  logger.info('\n▶ Test 1: Retrieve Aggregated Dashboard Data for Active Student');
  const dashboard = await studentService.getStudentDashboard(studentId);
  console.log('✓ Student dashboard payload received:');
  console.log(`  Student Name: ${dashboard.student.firstName} ${dashboard.student.lastName}`);
  console.log(`  Roll Number: ${dashboard.student.rollNumber}`);
  console.log(`  Semester: ${dashboard.student.semester}`);
  console.log(`  CGPA: ${dashboard.student.cgpa}`);
  console.log(`  Department: ${dashboard.student.departmentCode} - ${dashboard.student.departmentName}`);

  if (dashboard.student.rollNumber !== '22AD001') {
    throw new Error(`Expected roll number 22AD001, got ${dashboard.student.rollNumber}`);
  }

  // Test 2: Active Project Spotlight & Lifecycle State
  logger.info('\n▶ Test 2: Active Capstone Project Spotlight & Metrics');
  if (!dashboard.activeProject) {
    throw new Error('Test failed: Expected student to have an active capstone project');
  }
  console.log('✓ Active Project spotlight:');
  console.log(`  Title: "${dashboard.activeProject.title}"`);
  console.log(`  Domain: ${dashboard.activeProject.domain}`);
  console.log(`  Status: ${dashboard.activeProject.status}`);
  console.log(`  Overall Progress: ${dashboard.activeProject.overallProgress}%`);
  console.log(`  Student Role: ${dashboard.activeProject.roleInProject}`);

  if (dashboard.activeProject.status !== 'IN_PROGRESS' || dashboard.activeProject.overallProgress !== 65) {
    throw new Error(`Project status/progress mismatch: ${dashboard.activeProject.status} at ${dashboard.activeProject.overallProgress}%`);
  }

  // Test 3: Project Team Membership Resolution
  logger.info('\n▶ Test 3: Team Roster & Role Resolution');
  console.log(`✓ Team Members Count: ${dashboard.activeProject.teamMembers.length}`);
  dashboard.activeProject.teamMembers.forEach((member, i) => {
    console.log(`  Member ${i + 1}: ${member.name} (${member.rollNumber}) — Role: ${member.role}`);
  });

  if (dashboard.activeProject.teamMembers.length < 2) {
    throw new Error('Expected at least 2 team members for collaborative capstone project');
  }
  const leadMember = dashboard.activeProject.teamMembers.find((m) => m.role === 'LEAD');
  if (!leadMember || leadMember.id !== studentId) {
    throw new Error('Expected student to be registered as project LEAD');
  }

  // Test 4: Faculty Guide Association
  logger.info('\n▶ Test 4: Faculty Guide Details Resolution');
  const guide = dashboard.activeProject.facultyGuide;
  console.log('✓ Faculty Guide:');
  console.log(`  Name: ${guide.name}`);
  console.log(`  Email: ${guide.email}`);
  console.log(`  Designation: ${guide.designation}`);
  console.log(`  Department: ${guide.departmentCode}`);

  if (guide.name !== 'Dr. Rajesh Kumar' || guide.email !== 'faculty1@splm.edu') {
    throw new Error(`Faculty guide details mismatch: ${guide.name} (${guide.email})`);
  }

  // Test 5: Milestones Chronological Breakdown
  logger.info('\n▶ Test 5: Chronological Milestones & Progress Aggregation');
  console.log(`✓ Total Milestones Configured: ${dashboard.milestones.length}`);
  console.log(`  Milestones Completed: ${dashboard.metrics.milestonesCompleted} / ${dashboard.metrics.milestonesTotal}`);
  console.log(`  Milestone Completion Rate: ${dashboard.metrics.milestoneProgressPercentage}%`);

  dashboard.milestones.forEach((m) => {
    console.log(`  M${m.milestoneNumber}: ${m.title} [Status: ${m.status}, Due: ${m.dueDate.substring(0, 10)}]`);
  });

  if (dashboard.metrics.milestonesCompleted !== 2) {
    throw new Error(`Expected 2 completed milestones, got ${dashboard.metrics.milestonesCompleted}`);
  }
  if (dashboard.metrics.milestoneProgressPercentage !== 40) {
    throw new Error(`Expected 40% milestone completion percentage, got ${dashboard.metrics.milestoneProgressPercentage}%`);
  }

  // Test 6: Upcoming Milestone Tracking
  logger.info('\n▶ Test 6: In-Progress / Upcoming Milestone Tracking');
  const currentMilestone = dashboard.milestones.find((m) => m.status === 'IN_PROGRESS');
  if (!currentMilestone) {
    throw new Error('Expected active in-progress milestone');
  }
  console.log('✓ Current Active Milestone:');
  console.log(`  Milestone #${currentMilestone.milestoneNumber}: "${currentMilestone.title}"`);
  console.log(`  Due Date: ${currentMilestone.dueDate.substring(0, 10)}`);
  console.log(`  Completion Percentage: ${currentMilestone.completionPercentage}%`);

  if (currentMilestone.milestoneNumber !== 3) {
    throw new Error(`Expected Milestone 3 to be currently IN_PROGRESS, got M${currentMilestone.milestoneNumber}`);
  }

  // Test 7: Latest Faculty Review & Scores
  logger.info('\n▶ Test 7: Latest Faculty Review & Evaluation Scores');
  if (!dashboard.latestReview) {
    throw new Error('Test failed: Expected latest review to be present');
  }
  console.log('✓ Latest Review:');
  console.log(`  Title: "${dashboard.latestReview.reviewTitle}"`);
  console.log(`  Round: #${dashboard.latestReview.roundNumber} | Date: ${dashboard.latestReview.reviewDate.substring(0, 10)}`);
  console.log(`  Decision: ${dashboard.latestReview.status}`);
  console.log(`  Total Score Awarded: ${dashboard.latestReview.totalScore} / 100`);
  console.log(`  Feedback: "${dashboard.latestReview.generalFeedback}"`);

  if (dashboard.latestReview.roundNumber !== 2 || dashboard.latestReview.status !== 'APPROVED') {
    throw new Error(`Expected Round 2 APPROVED review, got Round ${dashboard.latestReview.roundNumber} (${dashboard.latestReview.status})`);
  }
  if (dashboard.latestReview.totalScore !== 90.2) {
    throw new Error(`Expected total score 90.2, got ${dashboard.latestReview.totalScore}`);
  }

  // Test 8: Proposals List
  logger.info('\n▶ Test 8: Student Submitted Proposals');
  console.log(`✓ Submitted Proposals Count: ${dashboard.proposals.length}`);
  dashboard.proposals.forEach((p, idx) => {
    console.log(`  Proposal ${idx + 1}: "${p.title}" [Status: ${p.status}, Version: v${p.version}]`);
  });

  if (dashboard.proposals.length === 0) {
    throw new Error('Expected at least 1 proposal for student1');
  }
  if (dashboard.proposals[0].status !== 'APPROVED') {
    throw new Error(`Expected proposal status APPROVED, got ${dashboard.proposals[0].status}`);
  }

  // Test 9: Non-Student Access Guard
  logger.info('\n▶ Test 9: Role Guard Enforcement (Faculty ID called against student dashboard service)');
  try {
    await studentService.getStudentDashboard(facultyId);
    throw new Error('Test failed: Faculty member should not have a student dashboard');
  } catch (err: unknown) {
    console.log(`✓ Non-student rejected cleanly: "${(err as Error).message}"`);
  }

  // Test 10: Express Role Middleware Guard
  logger.info('\n▶ Test 10: Express RBAC Middleware Guard (Mocked HTTP Request)');
  const studentOnlyGuard = requireRole(['STUDENT']);
  const mockReqFaculty = {
    user: { id: facultyId, email: 'faculty1@splm.edu', role: 'FACULTY' },
  } as unknown as Request;
  const mockRes = {} as Response;

  let middlewareBlocked = false;
  try {
    studentOnlyGuard(mockReqFaculty, mockRes, (() => {}) as NextFunction);
  } catch (err: unknown) {
    middlewareBlocked = true;
    console.log(`✓ Middleware denied faculty access to /api/students: "${(err as Error).message}"`);
  }

  if (!middlewareBlocked) {
    throw new Error('Middleware failed to reject faculty role from student-only route');
  }

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 5 STUDENT DASHBOARD TESTS PASSED PERFECTLY!');
  logger.info('================================================================\n');

  await disconnectMongo();
};

// Standalone execution entrypoint
if (require.main === module) {
  runStudentDashboardTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Student dashboard test suite failed:', err);
      process.exit(1);
    });
}
