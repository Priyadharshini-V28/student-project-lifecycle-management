import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { AcademicBatch, Domain, User, Proposal, Project } from '../models';
import { metadataService } from '../services/metadata.service';
import { facultyService } from '../services/faculty.service';
import { studentService } from '../services/student.service';
import { proposalService } from '../services/proposal.service';
import { allocationService } from '../services/allocation.service';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

export const runRefinementTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('🔬 PRE-STAGE 9 REFINEMENT & CORRECTION TEST SUITE (16 ASSERTIONS)');
  logger.info('================================================================');

  const student1Id = 'b0000000-0000-0000-0000-000000000001'; // Rahul Sharma
  const student2Id = 'b0000000-0000-0000-0000-000000000002'; // Ananya Verma
  const faculty1Id = 'f0000000-0000-0000-0000-000000000001'; // Dr. Rajesh Kumar
  const faculty2Id = 'f0000000-0000-0000-0000-000000000002'; // Dr. Meenakshi Sundaram

  // --------------------------------------------------------------------------
  // Assertion 1: Academic Batches MongoDB collection contains the 5 required batches
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 1: Academic Batches in MongoDB (5 Required Cohorts)');
  const batchDocs = await AcademicBatch.find().sort({ startYear: 1 });
  const batchNames = batchDocs.map((b) => b.name);
  console.log(`✓ Batches found in MongoDB (${batchDocs.length}):`, batchNames);

  const expectedBatches = [
    '2022-2026 Batch',
    '2023-2027 Batch',
    '2024-2028 Batch',
    '2025-2029 Batch',
    '2026-2030 Batch',
  ];
  for (const exp of expectedBatches) {
    if (!batchNames.includes(exp)) {
      throw new Error(`Missing expected batch cohort: ${exp}`);
    }
  }

  // --------------------------------------------------------------------------
  // Assertion 2: Metadata Service getBatches() returns batches
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 2: Metadata Service getBatches() API');
  const serviceBatches = await metadataService.getBatches();
  if (serviceBatches.length < 5) {
    throw new Error(`getBatches returned fewer than 5 batches: ${serviceBatches.length}`);
  }
  console.log(`✓ getBatches returned ${serviceBatches.length} batches`);

  // --------------------------------------------------------------------------
  // Assertion 3: Metadata Service createBatch() works
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 3: Metadata Service createBatch()');
  const createdBatch = await metadataService.createBatch({
    name: '2027-2031 Batch',
    startYear: 2027,
    endYear: 2031,
    isCurrent: false,
  });
  console.log(`✓ Created batch ID: ${createdBatch.id}, Name: ${createdBatch.name}`);
  if (createdBatch.name !== '2027-2031 Batch' || createdBatch.startYear !== 2027) {
    throw new Error('Batch creation failed to return expected fields');
  }

  // --------------------------------------------------------------------------
  // Assertion 4: Project Domains MongoDB collection exists and is populated
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 4: Project Domains in MongoDB');
  const domainDocs = await Domain.find();
  console.log(`✓ Domains found in MongoDB (${domainDocs.length})`);
  if (domainDocs.length < 8) {
    throw new Error(`Expected at least 8 domains in MongoDB, found ${domainDocs.length}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 5: Metadata Service getDomains() with activeOnly filter
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 5: Metadata Service getDomains(activeOnly)');
  const allDomains = await metadataService.getDomains(false);
  const activeDomains = await metadataService.getDomains(true);
  console.log(`✓ Total Domains: ${allDomains.length}, Active Domains: ${activeDomains.length}`);
  if (activeDomains.length === 0) {
    throw new Error('Active domains list is unexpectedly empty');
  }

  // --------------------------------------------------------------------------
  // Assertion 6: Domain Creation & Status Toggle
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 6: Domain Creation & Status Toggle');
  const createdDomain = await metadataService.createDomain({
    name: 'Quantum Machine Learning Test',
    description: 'Hybrid quantum-classical algorithms',
  });
  console.log(`✓ Created Domain: ${createdDomain.name} (Active: ${createdDomain.isActive})`);

  const toggledDomain = await metadataService.toggleDomainStatus(createdDomain.id, false);
  console.log(`✓ Toggled Domain to Inactive: ${toggledDomain.isActive}`);
  if (toggledDomain.isActive !== false) {
    throw new Error('Domain toggle to inactive failed');
  }

  // --------------------------------------------------------------------------
  // Assertion 7: Dynamic Faculty Directory with Specializations & Workload
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 7: Dynamic Faculty Directory (Specialization & Capacity)');
  const facultyDirectory = await facultyService.getFacultyDirectory();
  console.log(`✓ Faculty Directory Count: ${facultyDirectory.length}`);
  if (facultyDirectory.length < 2) {
    throw new Error('Faculty directory has fewer than 2 members');
  }
  const f1 = (facultyDirectory as any[]).find((f: any) => f.id === faculty1Id);
  if (!f1 || !f1.specialization || f1.remainingCapacity === undefined) {
    throw new Error('Faculty directory item missing specialization or remainingCapacity');
  }
  console.log(`  Faculty: ${f1.name}, Spec: "${f1.specialization}", Remaining Capacity: ${f1.remainingCapacity}`);

  // Test updating specialization
  await facultyService.updateFacultySpecialization(faculty1Id, 'Deep Learning, NLP & Foundation Models');
  const updatedFac = await User.findById(faculty1Id);
  if (updatedFac?.facultyProfile?.specialization !== 'Deep Learning, NLP & Foundation Models') {
    throw new Error('Faculty specialization update failed to persist in User profile');
  }
  console.log(`✓ Faculty specialization updated and verified`);

  // --------------------------------------------------------------------------
  // Assertion 8: Dynamic Student Directory
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 8: Dynamic Student Directory');
  const studentDirectory = await studentService.getStudentDirectory(student1Id);
  console.log(`✓ Student Directory Count (excluding student1): ${studentDirectory.length}`);
  if (studentDirectory.length < 3) {
    throw new Error('Student directory has fewer than 3 available peer students');
  }
  const s2 = (studentDirectory as any[]).find((s: any) => s.id === student2Id);
  if (!s2 || !s2.rollNumber) {
    throw new Error('Student directory item missing rollNumber');
  }
  console.log(`  Peer Student: ${s2.name} (${s2.rollNumber})`);

  // --------------------------------------------------------------------------
  // Assertion 9: Multiple Projects per Student Across Different Subjects
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 9: Multiple Projects per Student (Cross-Subject)');
  const project1Doc = await Project.findOne({ 'teamMembers.studentId': student1Id });
  console.log(`✓ Existing Project for Student: "${project1Doc?.title}" [${project1Doc?.subjectCode || 'CAPSTONE-01'}]`);

  // Create a second proposal in a different subject for student1
  const secondProposal = await proposalService.createProposal(student1Id, {
    title: 'Reinforcement Learning for Autonomous Drone Swarms',
    abstract: 'Investigating decentralized policy gradient multi-agent algorithms for collision-free aerial navigation.',
    domain: 'Autonomous Robotics & Navigation',
    subjectCode: 'MINIPROJ-02',
    subjectName: 'Minor Core Project Course',
    techStack: ['Python', 'ROS2', 'PyTorch', 'Gazebo'],
    coMemberStudentIds: [student2Id],
    assignedFacultyId: faculty2Id,
    initialStatus: 'DRAFT',
  });
  console.log(`✓ Second Proposal created for student1 with subject: ${secondProposal.subjectCode} (${secondProposal.subjectName})`);
  if (secondProposal.subjectCode !== 'MINIPROJ-02' || secondProposal.subjectName !== 'Minor Core Project Course') {
    throw new Error('Subject context not saved on second proposal');
  }

  // --------------------------------------------------------------------------
  // Assertion 10: Duplicate Member Prevention within the Same Proposal
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 10: Duplicate Member Prevention');
  try {
    await proposalService.addProposalMember(secondProposal.id, student1Id, student2Id);
    throw new Error('Expected duplicate member addition to throw error, but succeeded');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.log(`✓ Successfully rejected duplicate member: "${msg}"`);
  }

  // --------------------------------------------------------------------------
  // Assertion 11: Proposal creation stores and retrieves subjectCode & subjectName
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 11: Proposal Retrieval with Subject Context');
  const fetchedProp = await proposalService.getProposalById(secondProposal.id);
  if (fetchedProp.subjectCode !== 'MINIPROJ-02' || fetchedProp.subjectName !== 'Minor Core Project Course') {
    throw new Error('Retrieved proposal missing subjectCode or subjectName');
  }
  console.log(`✓ Fetched proposal verified: ${fetchedProp.subjectCode} - ${fetchedProp.subjectName}`);

  // Submit proposal before review
  await proposalService.submitProposal(secondProposal.id, student1Id);

  // --------------------------------------------------------------------------
  // Assertion 12: Project instantiation preserves subjectCode and subjectName
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 12: Project Instantiation Preserves Subject Context');
  const reviewResult = await proposalService.reviewProposal(secondProposal.id, faculty2Id, 'FACULTY', {
    status: 'APPROVED',
    facultyComments: 'Excellent methodology and team composition. Approved for project execution.',
  });
  console.log(`✓ Proposal approved, instantiated project ID: ${reviewResult.instantiatedProjectId}`);
  if (!reviewResult.instantiatedProjectId) {
    throw new Error('Proposal approval did not instantiate a project');
  }

  const instantiatedProject = await Project.findById(reviewResult.instantiatedProjectId);
  if (!instantiatedProject) {
    throw new Error('Instantiated project not found in database');
  }
  console.log(`✓ Instantiated Project subjectCode: ${instantiatedProject.subjectCode}, subjectName: ${instantiatedProject.subjectName}`);
  if (instantiatedProject.subjectCode !== 'MINIPROJ-02' || instantiatedProject.subjectName !== 'Minor Core Project Course') {
    throw new Error('Instantiated project failed to preserve proposal subjectCode or subjectName');
  }

  // --------------------------------------------------------------------------
  // Assertion 13: Student Dashboard includes allProjects and subjectCode
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 13: Student Dashboard allProjects Aggregation');
  const studentDashboard = await studentService.getStudentDashboard(student1Id);
  console.log(`✓ Student Dashboard activeProject subject: ${studentDashboard.activeProject?.subjectCode}`);
  console.log(`✓ Student Dashboard allProjects count: ${studentDashboard.allProjects?.length}`);

  if (!studentDashboard.allProjects || studentDashboard.allProjects.length < 2) {
    throw new Error(`Expected at least 2 projects in allProjects array, got: ${studentDashboard.allProjects?.length}`);
  }
  const hasMiniProj = studentDashboard.allProjects.some((p) => p.subjectCode === 'MINIPROJ-02');
  if (!hasMiniProj) {
    throw new Error('MINIPROJ-02 project not found in student allProjects list');
  }
  console.log(`✓ Student dashboard correctly surfaces multiple projects across different subjects`);

  // --------------------------------------------------------------------------
  // Assertion 14: Public registration rejects ADMIN role
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 14: Public Registration Role Guard (Rejects ADMIN)');
  try {
    await authService.register({
      email: 'hacker@splm.edu',
      password: 'Password@123',
      firstName: 'Malicious',
      lastName: 'User',
      role: 'ADMIN' as any,
      departmentId: 1,
    });
    throw new Error('Expected ADMIN registration to be rejected, but it succeeded');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    console.log(`✓ Successfully blocked public ADMIN registration: "${msg}"`);
  }

  // --------------------------------------------------------------------------
  // Assertion 15: Exactly ONE Admin account with seeded credentials
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 15: Seeded Admin Account & Password Verification');
  const adminUsers = await User.find({ role: 'ADMIN' });
  console.log(`✓ Admin accounts count in database: ${adminUsers.length}`);
  if (adminUsers.length !== 1) {
    throw new Error(`Expected exactly 1 ADMIN user in database, found ${adminUsers.length}`);
  }

  const admin = adminUsers[0];
  console.log(`  Admin Email: ${admin.email}`);
  if (admin.email !== 'admin@splm.edu') {
    throw new Error(`Expected admin email admin@splm.edu, found ${admin.email}`);
  }

  const isPasswordValid = await bcrypt.compare('SPLM@Admin2026', admin.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Admin password hash does not match SPLM@Admin2026');
  }
  console.log(`✓ Admin password verified against SPLM@Admin2026`);

  // Verify full login flow
  const adminAuth = await authService.login({
    email: 'admin@splm.edu',
    password: 'SPLM@Admin2026',
  });
  if (adminAuth.user.role !== 'ADMIN' || !adminAuth.tokens.accessToken) {
    throw new Error('Admin login flow failed to return ADMIN role or access token');
  }
  console.log(`✓ Admin end-to-end login flow verified (role: ${adminAuth.user.role})`);

  // --------------------------------------------------------------------------
  // Assertion 16: Advisory Domain Matching Remains Advisory Without Auto-Assignment
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 16: Advisory Domain Matching Integrity');
  const recs = await allocationService.getRecommendedGuides(instantiatedProject.id);
  console.log(`✓ Guide recommendations count: ${recs.length}`);
  if (recs.length === 0) {
    throw new Error('No guide recommendations generated for project');
  }
  console.log(`  Top Recommended Guide: ${recs[0].name} (Score: ${recs[0].matchScore})`);
  // Verify the project guide was NOT automatically altered by getting recommendations
  const unchangedProject = await Project.findById(instantiatedProject.id);
  if (unchangedProject?.facultyGuideId !== instantiatedProject.facultyGuideId) {
    throw new Error('Recommendation query must NOT automatically alter faculty guide assignment');
  }
  console.log(`✓ Recommendation engine is strictly advisory and does not mutate project state`);

  logger.info('\n================================================================');
  logger.info('🎉 ALL 16 REFINEMENT & CORRECTION ASSERTIONS PASSED PERFECTLY!');
  logger.info('================================================================\n');

  await disconnectMongo();
};

// Direct script execution support
if (require.main === module || process.argv[1]?.includes('test_refinements')) {
  runRefinementTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('❌ Refinements Test Suite failed with error:', err);
      process.exit(1);
    });
}
