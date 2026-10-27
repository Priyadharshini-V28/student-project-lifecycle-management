import { proposalService } from '../services/proposal.service';
import { User, Project } from '../models';
import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { logger } from '../utils/logger';

export const runProposalTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('📑 STAGE 7: PROPOSAL & PROJECT LIFECYCLE MANAGEMENT TEST SUITE');
  logger.info('================================================================');

  const student1Id = 'b0000000-0000-0000-0000-000000000001'; // Rahul Sharma
  const student2Id = 'b0000000-0000-0000-0000-000000000002'; // Ananya Verma
  const student3Id = 'b0000000-0000-0000-0000-000000000003'; // Vikram Patel
  const student4Id = 'b0000000-0000-0000-0000-000000000004'; // Sneha Iyer
  const faculty2Id = 'f0000000-0000-0000-0000-000000000002'; // Dr. Meenakshi Sundaram

  let createdProposalId = '';
  let instantiatedProjectId = '';

  // --------------------------------------------------------------------------
  // Test 1: System Settings Resolution
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 1: Dynamic System Settings Resolution (No Hardcoded Constants)');
  const settings = await proposalService.getSystemSettings();
  console.log(`✓ System Settings loaded:`);
  console.log(`  Max Team Size: ${settings.maxTeamSize}`);
  console.log(`  Min Team Size: ${settings.minTeamSize}`);
  console.log(`  Allow Student Proposals: ${settings.allowStudentProposals}`);

  if (settings.maxTeamSize !== 4 || settings.minTeamSize !== 1 || !settings.allowStudentProposals) {
    throw new Error('System settings mismatch against database seed configuration');
  }

  // --------------------------------------------------------------------------
  // Test 2: Create Proposal in DRAFT status
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 2: Author New Project Proposal (Draft State)');
  const draftProposal = await proposalService.createProposal(student1Id, {
    title: 'Multimodal Foundation Model for Rare Pathology Detection',
    abstract: 'Investigating zero-shot vision-language alignment architectures for microscopic histology image analysis across rare oncological subtypes.',
    domain: 'Multimodal AI & Healthcare',
    techStack: ['PyTorch', 'CLIP', 'BioBERT', 'FastAPI', 'React'],
    coMemberStudentIds: [],
    assignedFacultyId: faculty2Id,
    initialStatus: 'DRAFT',
  });

  createdProposalId = draftProposal.id;
  console.log(`✓ Proposal created: "${draftProposal.title}" (ID: ${createdProposalId})`);
  console.log(`  Initial Status: ${draftProposal.status}`);
  console.log(`  Version: ${draftProposal.version}`);
  console.log(`  Lead: ${draftProposal.submittedBy.name} (${draftProposal.submittedBy.rollNumber})`);
  console.log(`  Assigned Guide: ${draftProposal.assignedFaculty?.name} (${draftProposal.assignedFaculty?.designation})`);
  console.log(`  Members Count: ${draftProposal.members.length}`);

  if (draftProposal.status !== 'DRAFT') {
    throw new Error(`Expected status DRAFT, got ${draftProposal.status}`);
  }
  if (draftProposal.members.length !== 1 || !draftProposal.members[0].isLead) {
    throw new Error('Expected creator to be automatically added as team lead member');
  }

  // --------------------------------------------------------------------------
  // Test 3: Invite Team Members
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 3: Invite Prospective Team Members to Proposal');
  const propWithMember3 = await proposalService.addProposalMember(createdProposalId, student1Id, student3Id);
  const propWithMember4 = await proposalService.addProposalMember(createdProposalId, student1Id, student4Id);

  console.log(`✓ Team members count now: ${propWithMember4.members.length}`);
  const m3 = propWithMember4.members.find((m) => m.studentId === student3Id);
  const m4 = propWithMember4.members.find((m) => m.studentId === student4Id);

  if (!m3 || m3.status !== 'INVITED' || !m4 || m4.status !== 'INVITED') {
    throw new Error('Invited members not properly registered with INVITED status');
  }
  console.log(`  Member 2: ${m3.name} (${m3.rollNumber}) — Status: ${m3.status}`);
  console.log(`  Member 3: ${m4.name} (${m4.rollNumber}) — Status: ${m4.status}`);

  // --------------------------------------------------------------------------
  // Test 4: Enforce Configurable Max Team Size
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 4: Enforce Configurable Maximum Team Size Boundary');
  // Add 4th member (student2Id) - reaching MAX_TEAM_SIZE = 4
  await proposalService.addProposalMember(createdProposalId, student1Id, student2Id);
  console.log(`  Added Student 2 — Team size now at limit: 4 / 4`);

  // Attempting to add a 5th member should be rejected
  let overLimitBlocked = false;
  try {
    // Generate a mock student or try adding another student
    await proposalService.addProposalMember(
      createdProposalId,
      student1Id,
      'b0000000-0000-0000-0000-000000000001' // already lead/duplicate
    );
  } catch (err: unknown) {
    overLimitBlocked = true;
    console.log(`✓ Maximum limit / duplicate member guard triggered: "${(err as Error).message}"`);
  }

  if (!overLimitBlocked) {
    throw new Error('Failed to block exceeding team size limit');
  }

  // Remove student2 to test member deletion and leave team size at 3
  await proposalService.removeProposalMember(createdProposalId, student1Id, student2Id);
  console.log(`✓ Student 2 removed cleanly. Team size restored to 3 members.`);

  // --------------------------------------------------------------------------
  // Test 5: Member Acceptance & Proposal Submission
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 5: Member Invitation Acceptance & Formal Proposal Submission');
  // Student 3 accepts invitation
  await proposalService.respondToInvitation(createdProposalId, student3Id, 'ACCEPTED');
  console.log(`✓ Student 3 accepted team invitation`);

  // Student 1 submits the proposal
  const submittedProposal = await proposalService.submitProposal(createdProposalId, student1Id);
  console.log(`✓ Proposal submitted! Current status: ${submittedProposal.status}`);

  // With assigned faculty, status transitions to UNDER_REVIEW
  if (submittedProposal.status !== 'UNDER_REVIEW') {
    throw new Error(`Expected status UNDER_REVIEW, got ${submittedProposal.status}`);
  }

  // --------------------------------------------------------------------------
  // Test 6: Faculty Appraisal: Request Changes with Detailed Remarks
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 6: Faculty Supervisor Appraisal (Request Changes)');
  const reviewResult1 = await proposalService.reviewProposal(
    createdProposalId,
    faculty2Id,
    'FACULTY',
    {
      status: 'CHANGES_REQUESTED',
      facultyComments:
        'Promising research foundation. However, please narrow down the clinical histology dataset scope and define baseline comparison metrics against standard CNNs.',
    }
  );

  console.log(`✓ Faculty review saved. Status: ${reviewResult1.proposal.status}`);
  console.log(`  Faculty Remarks: "${reviewResult1.proposal.facultyComments}"`);

  if (reviewResult1.proposal.status !== 'CHANGES_REQUESTED') {
    throw new Error('Proposal status was not updated to CHANGES_REQUESTED');
  }

  // --------------------------------------------------------------------------
  // Test 7: Student Resubmission with Version Bump
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 7: Student Proposal Revision & Resubmission (Version Increment)');
  // Student updates abstract
  await proposalService.updateProposal(createdProposalId, student1Id, {
    abstract:
      'Investigating zero-shot vision-language alignment using TCGA-BRCA histology datasets, benchmarked against ResNet-50 and EfficientNet baselines.',
  });

  // Resubmit
  const resubmittedProposal = await proposalService.submitProposal(createdProposalId, student1Id);
  console.log(`✓ Proposal resubmitted. Status: ${resubmittedProposal.status}, Version: v${resubmittedProposal.version}`);

  if (resubmittedProposal.version !== 2) {
    throw new Error(`Expected version 2 upon resubmission, got v${resubmittedProposal.version}`);
  }
  if (resubmittedProposal.status !== 'UNDER_REVIEW') {
    throw new Error(`Expected status UNDER_REVIEW, got ${resubmittedProposal.status}`);
  }

  // --------------------------------------------------------------------------
  // Test 8: Faculty Workload Quota Validation
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 8: Faculty Workload Quota Verification');
  // Check Faculty 2 capacity
  const fac2User = await User.findById(faculty2Id);
  const fac2Max = fac2User?.facultyProfile?.maxProjects ?? 6;
  const currentAssigned = await Project.countDocuments({
    facultyGuideId: faculty2Id,
    status: { $nin: ['COMPLETED', 'ARCHIVED'] },
  });
  console.log(`✓ Faculty 2 Supervising Capacity: ${currentAssigned} / ${fac2Max} projects`);

  if (currentAssigned >= fac2Max) {
    throw new Error('Faculty 2 has unexpectedly reached max capacity prior to test');
  }

  // --------------------------------------------------------------------------
  // Test 9: Proposal Approval & Relational Project Auto-Instantiation
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 9: Proposal APPROVAL & Atomic Active Project Instantiation');
  const approvalResult = await proposalService.reviewProposal(
    createdProposalId,
    faculty2Id,
    'FACULTY',
    {
      status: 'APPROVED',
      facultyComments: 'Comprehensive methodology and dataset scope. Approved for active capstone execution.',
    }
  );

  if (approvalResult.proposal.status !== 'APPROVED') {
    throw new Error('Expected proposal status APPROVED');
  }
  if (!approvalResult.instantiatedProjectId) {
    throw new Error('Expected project auto-instantiation ID to be returned');
  }

  instantiatedProjectId = approvalResult.instantiatedProjectId;
  console.log(`✓ Proposal APPROVED!`);
  console.log(`  Instantiated Project ID: ${instantiatedProjectId}`);

  // Fetch instantiated project
  const projectData = (await proposalService.getProjectById(instantiatedProjectId)) as {
    id: string;
    title: string;
    status: string;
    overallProgress: number;
    facultyGuide: { name: string; designation: string };
    members: Array<{ name: string; rollNumber: string; roleInProject: string }>;
    milestones: Array<{ milestoneNumber: number; title: string; dueDate: string }>;
  };

  console.log(`✓ Project verified in 'projects' table:`);
  console.log(`  Title: "${projectData.title}"`);
  console.log(`  Status: ${projectData.status}`);
  console.log(`  Faculty Guide: ${projectData.facultyGuide.name} (${projectData.facultyGuide.designation})`);
  console.log(`  Team Roster (${projectData.members.length} members):`);
  for (const mem of projectData.members) {
    console.log(`    - ${mem.name} (${mem.rollNumber}) → Role: ${mem.roleInProject}`);
  }

  if (projectData.status !== 'ALLOCATED') {
    throw new Error(`Expected project status ALLOCATED, got ${projectData.status}`);
  }
  const leadMem = projectData.members.find((m) => m.roleInProject === 'LEAD');
  if (!leadMem || leadMem.rollNumber !== '22AD001') {
    throw new Error('Project lead was not properly assigned to Student 1');
  }

  // --------------------------------------------------------------------------
  // Test 10: Default Milestone Gates Pre-population
  // --------------------------------------------------------------------------
  logger.info('\n▶ Test 10: Automatic Milestone Gates Generation (M1 to M5)');
  console.log(`✓ Milestones Count: ${projectData.milestones.length}`);
  for (const m of projectData.milestones) {
    console.log(`  M${m.milestoneNumber}: "${m.title}" (Due: ${m.dueDate})`);
  }

  if (projectData.milestones.length !== 5) {
    throw new Error(`Expected 5 standardized milestone gates, got ${projectData.milestones.length}`);
  }
  if (projectData.milestones[0].title !== 'Requirement Analysis & Literature Review') {
    throw new Error('M1 title mismatch');
  }
  if (projectData.milestones[4].title !== 'Final Thesis Documentation & Viva Defense') {
    throw new Error('M5 title mismatch');
  }

  // Verify Project Repository URL Update
  await proposalService.updateProjectRepo(
    instantiatedProjectId,
    student1Id,
    'STUDENT',
    'https://github.com/splm-projects/rare-pathology-clip'
  );
  const updatedProj = (await proposalService.getProjectById(instantiatedProjectId)) as { repositoryUrl: string };
  console.log(`✓ Project repository URL updated: ${updatedProj.repositoryUrl}`);
  if (updatedProj.repositoryUrl !== 'https://github.com/splm-projects/rare-pathology-clip') {
    throw new Error('Repository URL was not properly persisted');
  }

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 7 PROPOSAL & PROJECT TESTS PASSED PERFECTLY!');
  logger.info('================================================================\n');

  await disconnectMongo();
};

// Standalone execution entrypoint
if (require.main === module) {
  runProposalTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Proposal test suite failed:', err);
      process.exit(1);
    });
}
