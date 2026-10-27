import { allocationService } from '../services/allocation.service';
import { studentService } from '../services/student.service';
import { facultyService } from '../services/faculty.service';
import { User, Project, Proposal, AuditLog } from '../models';
import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { logger } from '../utils/logger';

export const runAllocationTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('⚖️ STAGE 8: FACULTY GUIDE ALLOCATION & WORKLOAD TEST SUITE');
  logger.info('================================================================');

  const adminId = 'a0000000-0000-0000-0000-000000000001'; // Dr. Aruna Devi (ADMIN)
  const faculty1Id = 'f0000000-0000-0000-0000-000000000001'; // Dr. Rajesh Kumar (FACULTY)
  const faculty2Id = 'f0000000-0000-0000-0000-000000000002'; // Dr. Meenakshi Sundaram (FACULTY)
  const student1Id = 'b0000000-0000-0000-0000-000000000001'; // Rahul Sharma (STUDENT)
  const projectId = 'e0000000-0000-0000-0000-000000000001'; // Diabetic Retinopathy active project
  const proposalId = 'c0000000-0000-0000-0000-000000000002'; // Privacy-Preserving Federated Learning

  // --------------------------------------------------------------------------
  // Test 1: Departmental Faculty Allocation Matrix Retrieval
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 1: Departmental Faculty Capacity Matrix Retrieval');
  const matrix = await allocationService.getFacultyAllocationMatrix(1);

  console.log(`✓ Faculty Capacity Matrix loaded:`);
  console.log(`  Total Faculty Members: ${matrix.summary.totalFaculty}`);
  console.log(`  Total Department Capacity: ${matrix.summary.totalCapacity}`);
  console.log(`  Total Assigned Projects: ${matrix.summary.totalAssigned}`);
  console.log(`  Available Supervising Slots: ${matrix.summary.availableSlots}`);
  console.log(`  Department Utilization: ${matrix.summary.overallUtilization}%`);

  if (matrix.summary.totalFaculty < 2 || matrix.summary.totalAssigned !== 1) {
    throw new Error(`Matrix summary numbers incorrect. Got assigned: ${matrix.summary.totalAssigned}`);
  }

  const fac1 = matrix.faculty.find((f) => f.id === faculty1Id);
  const fac2 = matrix.faculty.find((f) => f.id === faculty2Id);

  if (!fac1 || !fac2) {
    throw new Error('Expected faculty members not found in capacity matrix');
  }

  console.log(`  Faculty 1 (${fac1.name}): Assigned ${fac1.currentlyAssigned}/${fac1.maxProjects} (Remaining: ${fac1.remainingCapacity}) [${fac1.status}]`);
  console.log(`  Faculty 2 (${fac2.name}): Assigned ${fac2.currentlyAssigned}/${fac2.maxProjects} (Remaining: ${fac2.remainingCapacity}) [${fac2.status}]`);

  if (fac1.currentlyAssigned !== 1 || fac1.remainingCapacity !== 4 || fac1.status !== 'AVAILABLE') {
    throw new Error('Faculty 1 workload metrics mismatch');
  }
  if (fac2.currentlyAssigned !== 0 || fac2.remainingCapacity !== 6 || fac2.status !== 'AVAILABLE') {
    throw new Error('Faculty 2 workload metrics mismatch');
  }

  // --------------------------------------------------------------------------
  // Test 2: Advisory Domain-Based Recommendation Engine
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 2: Advisory Domain Recommendation & Specialization Ranking');
  const recs = await allocationService.getRecommendedGuides(proposalId);

  console.log(`✓ Guide recommendations generated for proposal ${proposalId}:`);
  for (const r of recs) {
    console.log(`  - ${r.name} (${r.designation}): ${r.matchScore}% Match`);
    console.log(`    Reason: ${r.recommendationReason}`);
    console.log(`    Matched Keywords: [${r.matchedKeywords.join(', ')}]`);
  }

  if (recs.length === 0) {
    throw new Error('Expected recommendations to be returned');
  }

  // Dr. Meenakshi specializes in Federated Learning, so she should rank first
  const topRec = recs[0];
  if (topRec.facultyId !== faculty2Id) {
    throw new Error(`Expected Faculty 2 (Dr. Meenakshi Sundaram) to rank highest for federated learning proposal, got: ${topRec.name}`);
  }
  if (!topRec.matchedKeywords.includes('federated') && !topRec.matchedKeywords.includes('learning')) {
    throw new Error('Expected keyword match on federated or learning');
  }

  // --------------------------------------------------------------------------
  // Test 3: Workload Capacity Guard Rejection (Full Quota)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 3: Workload Capacity Guard Rejection (Enforce maxProjects limit)');
  // Temporarily set Faculty 2's capacity to 0
  await User.findByIdAndUpdate(faculty2Id, { 'facultyProfile.maxProjects': 0 });

  let workloadGuardTriggered = false;
  try {
    await allocationService.reassignProjectGuide(
      projectId,
      faculty2Id,
      adminId,
      'ADMIN',
      'Test reassignment when quota full'
    );
  } catch (err: unknown) {
    workloadGuardTriggered = true;
    console.log(`✓ Workload guard properly rejected allocation: "${(err as Error).message}"`);
  } finally {
    // Restore Faculty 2 capacity
    await User.findByIdAndUpdate(faculty2Id, { 'facultyProfile.maxProjects': 6 });
  }

  if (!workloadGuardTriggered) {
    throw new Error('Workload guard failed to reject allocation when quota was full');
  }

  // --------------------------------------------------------------------------
  // Test 4: Role Boundary Enforcement (Student cannot supervise)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 4: Role Boundary Guard (Attempting to allocate student as guide)');
  let studentGuardTriggered = false;
  try {
    await allocationService.reassignProjectGuide(
      projectId,
      student1Id,
      adminId,
      'ADMIN',
      'Attempt to assign student as guide'
    );
  } catch (err: unknown) {
    studentGuardTriggered = true;
    console.log(`✓ Role guard cleanly rejected student guide assignment: "${(err as Error).message}"`);
  }

  if (!studentGuardTriggered) {
    throw new Error('Role guard failed to reject assigning a student as faculty guide');
  }

  // --------------------------------------------------------------------------
  // Test 5: Reassignment to Same Guide Guard
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 5: Redundant Reallocation Guard (Same Faculty)');
  let sameGuideGuardTriggered = false;
  try {
    await allocationService.reassignProjectGuide(
      projectId,
      faculty1Id, // Currently already assigned to Faculty 1
      adminId,
      'ADMIN',
      'Reassign to existing supervisor'
    );
  } catch (err: unknown) {
    sameGuideGuardTriggered = true;
    console.log(`✓ Redundant guide reallocation rejected: "${(err as Error).message}"`);
  }

  if (!sameGuideGuardTriggered) {
    throw new Error('Failed to reject reallocating project to its existing supervisor');
  }

  // --------------------------------------------------------------------------
  // Test 6: Successful Project Guide Reallocation
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 6: Execute Project Guide Reallocation');
  const reassignResult = await allocationService.reassignProjectGuide(
    projectId,
    faculty2Id,
    adminId,
    'ADMIN',
    'Faculty research domain realignment and departmental load rebalancing'
  );

  console.log(`✓ Project successfully reallocated:`);
  console.log(`  Project ID: ${projectId}`);
  console.log(`  New Guide ID: ${faculty2Id}`);
  console.log(`  Generated Audit Log ID: ${reassignResult.auditLogId}`);

  const updatedProject = await Project.findById(projectId);
  if (!updatedProject || updatedProject.facultyGuideId !== faculty2Id) {
    throw new Error(`Project facultyGuideId not updated in database. Got: ${updatedProject?.facultyGuideId}`);
  }

  // --------------------------------------------------------------------------
  // Test 7: Immutable AuditLog Verification
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 7: Verify Immutable Audit Trail Record');
  const auditEntry = await AuditLog.findOne({
    action: 'PROJECT_GUIDE_REALLOCATED',
    entityId: projectId,
  }).sort({ createdAt: -1 });

  if (!auditEntry) {
    throw new Error('AuditLog entry not found for guide reallocation action');
  }

  console.log(`✓ Audit log verified:`);
  console.log(`  Action: ${auditEntry.action}`);
  console.log(`  Requester: ${auditEntry.userId}`);
  console.log(`  Previous Guide: ${auditEntry.details?.previousFacultyGuideId}`);
  console.log(`  New Guide: ${auditEntry.details?.newFacultyGuideId}`);
  console.log(`  Reason: "${auditEntry.details?.reason}"`);

  if (
    auditEntry.details?.previousFacultyGuideId !== faculty1Id ||
    auditEntry.details?.newFacultyGuideId !== faculty2Id
  ) {
    throw new Error('Audit log details do not match reallocation participants');
  }

  // --------------------------------------------------------------------------
  // Test 8: Student Dashboard Reflection of Reallocated Guide
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 8: Student Dashboard Real-Time Reflection');
  const studentDashboard = await studentService.getStudentDashboard(student1Id);

  console.log(`✓ Student Dashboard active project supervisor:`);
  console.log(`  Supervisor ID: ${studentDashboard.activeProject?.facultyGuide.id}`);
  console.log(`  Supervisor Name: ${studentDashboard.activeProject?.facultyGuide.name}`);
  console.log(`  Supervisor Email: ${studentDashboard.activeProject?.facultyGuide.email}`);

  if (studentDashboard.activeProject?.facultyGuide.id !== faculty2Id) {
    throw new Error(`Student dashboard does not reflect reallocated faculty guide ID`);
  }
  if (!studentDashboard.activeProject?.facultyGuide.name.includes('Meenakshi')) {
    throw new Error(`Student dashboard supervisor name does not reflect Dr. Meenakshi Sundaram`);
  }

  // --------------------------------------------------------------------------
  // Test 9: Faculty Dashboard Real-Time Workload Reflection
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 9: Faculty Dashboard Real-Time Workload Recalculation');
  const fac1Dashboard = await facultyService.getFacultyDashboard(faculty1Id);
  const fac2Dashboard = await facultyService.getFacultyDashboard(faculty2Id);

  console.log(`✓ Faculty 1 (Dr. Rajesh Kumar) active projects count: ${fac1Dashboard.metrics.currentlyAssigned} (expected: 0)`);
  console.log(`✓ Faculty 2 (Dr. Meenakshi Sundaram) active projects count: ${fac2Dashboard.metrics.currentlyAssigned} (expected: 1)`);

  if (fac1Dashboard.metrics.currentlyAssigned !== 0) {
    throw new Error(`Faculty 1 workload expected 0 active projects, got ${fac1Dashboard.metrics.currentlyAssigned}`);
  }
  if (fac2Dashboard.metrics.currentlyAssigned !== 1) {
    throw new Error(`Faculty 2 workload expected 1 active project, got ${fac2Dashboard.metrics.currentlyAssigned}`);
  }

  // --------------------------------------------------------------------------
  // Test 10: Proposal Supervisor Assignment & Admin Quota Adjustment
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 10: Proposal Supervisor Assignment & Admin Quota Adjustment');
  // Assign proposal to Faculty 1
  const assignedProposal = await allocationService.assignProposalGuide(
    proposalId,
    faculty1Id,
    adminId,
    'ADMIN'
  );
  console.log(`✓ Proposal supervisor successfully assigned to Faculty 1 (Status: ${(assignedProposal as any).status})`);

  // Update Faculty 1 capacity from 5 to 8
  const capacityResult = await allocationService.updateFacultyCapacity(
    faculty1Id,
    8,
    adminId
  );
  console.log(`✓ Admin updated Faculty 1 maximum supervising quota: ${(capacityResult as any).maxProjects} projects`);

  const updatedFac1 = await User.findById(faculty1Id);
  if (updatedFac1?.facultyProfile?.maxProjects !== 8) {
    throw new Error('Faculty capacity not updated in User document');
  }

  // Verify updated matrix reflects new capacity
  const postMatrix = await allocationService.getFacultyAllocationMatrix(1);
  const updatedFac1Item = postMatrix.faculty.find((f) => f.id === faculty1Id);
  console.log(`✓ Updated Matrix for Faculty 1: Max: ${updatedFac1Item?.maxProjects}, Remaining: ${updatedFac1Item?.remainingCapacity}`);

  if (updatedFac1Item?.maxProjects !== 8 || updatedFac1Item?.remainingCapacity !== 8) {
    throw new Error('Updated faculty quota not reflected in allocation matrix');
  }

  logger.info('================================================================');
  logger.info('🎉 ALL 10 STAGE 8 ALLOCATION TESTS PASSED PERFECTLY!');
  logger.info('================================================================\n');

  await disconnectMongo();
};

// Direct script execution support
if (require.main === module || process.argv[1]?.includes('test_allocation')) {
  runAllocationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('❌ Stage 8 Allocation Test failed with error:', err);
      process.exit(1);
    });
}
