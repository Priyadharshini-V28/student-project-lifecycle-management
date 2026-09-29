import crypto from 'crypto';
import {
  User,
  Proposal,
  Project,
  Department,
  SystemSetting,
  AuditLog,
} from '../models';
import { withMongoTransaction } from '../db/mongo';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import {
  CreateProposalInput,
  UpdateProposalInput,
  ReviewProposalInput,
} from '../validators/proposal.validator';

const toIsoString = (val: unknown): string => {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
};

const toDateString = (val: unknown): string => {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().substring(0, 10);
  return String(val).substring(0, 10);
};

export interface ProposalMemberItem {
  id: string | number;
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: number;
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED';
  isLead: boolean;
  joinedAt: string;
}

export interface ProposalDetail {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  techStack: string[];
  submittedBy: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    departmentCode: string;
  };
  assignedFaculty: {
    id: string;
    name: string;
    email: string;
    designation: string;
    departmentCode: string;
  } | null;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  facultyComments: string | null;
  version: number;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  members: ProposalMemberItem[];
  projectId: string | null;
}

export class ProposalService {
  /**
   * Fetch system-wide configurable constraints
   */
  async getSystemSettings(): Promise<{
    maxTeamSize: number;
    minTeamSize: number;
    allowStudentProposals: boolean;
  }> {
    const settings = await SystemSetting.find({
      key: { $in: ['MAX_TEAM_SIZE', 'MIN_TEAM_SIZE', 'ALLOW_STUDENT_PROPOSALS'] },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return {
      maxTeamSize: parseInt(map.MAX_TEAM_SIZE || '4', 10),
      minTeamSize: parseInt(map.MIN_TEAM_SIZE || '1', 10),
      allowStudentProposals: (map.ALLOW_STUDENT_PROPOSALS ?? 'true').toLowerCase() === 'true',
    };
  }

  /**
   * Create a new project proposal (as DRAFT or SUBMITTED)
   */
  async createProposal(studentUserId: string, input: CreateProposalInput): Promise<ProposalDetail> {
    // 1. Verify student account
    const student = await User.findOne({ _id: studentUserId, role: 'STUDENT' });
    if (!student) {
      throw ApiError.forbidden('Only enrolled students can author and submit project proposals.');
    }

    // 2. Check system policies
    const settings = await this.getSystemSettings();
    if (!settings.allowStudentProposals) {
      throw ApiError.badRequest('New project proposal submissions are currently disabled by departmental administration.');
    }

    // 3. Check team size boundary
    const coMemberIds = Array.from(new Set(input.coMemberStudentIds || [])).filter(
      (id) => id !== studentUserId
    );

    const totalProspectiveTeamSize = 1 + coMemberIds.length;
    if (totalProspectiveTeamSize > settings.maxTeamSize) {
      throw ApiError.badRequest(
        `Team size of ${totalProspectiveTeamSize} exceeds the platform maximum of ${settings.maxTeamSize} members.`
      );
    }

    // 4. Validate assigned faculty if provided
    if (input.assignedFacultyId) {
      const fac = await User.findOne({
        _id: input.assignedFacultyId,
        role: { $in: ['FACULTY', 'ADMIN'] },
      });
      if (!fac) {
        throw ApiError.badRequest('Selected faculty guide was not found in the faculty directory.');
      }
    }

    // 5. Verify prospective co-members are enrolled students
    if (coMemberIds.length > 0) {
      for (const mId of coMemberIds) {
        const mem = await User.findOne({ _id: mId, role: 'STUDENT' });
        if (!mem) {
          throw ApiError.badRequest(`User with ID ${mId} is not an enrolled student.`);
        }
      }
    }

    // 6. Determine initial status
    const initialStatus = input.initialStatus || 'DRAFT';
    const finalInitialStatus =
      initialStatus === 'SUBMITTED' && input.assignedFacultyId
        ? 'UNDER_REVIEW'
        : initialStatus;

    // 7. Execute transactional insertion
    const createdProposalId = await withMongoTransaction(async (session) => {
      const members = [
        {
          _id: crypto.randomUUID(),
          studentId: studentUserId,
          status: 'ACCEPTED' as const,
          isLead: true,
          joinedAt: new Date(),
        },
        ...coMemberIds.map((mId) => ({
          _id: crypto.randomUUID(),
          studentId: mId,
          status: 'INVITED' as const,
          isLead: false,
          joinedAt: new Date(),
        })),
      ];

      const propDoc = new Proposal({
        title: input.title,
        abstract: input.abstract,
        domain: input.domain,
        techStack: input.techStack || [],
        submittedBy: studentUserId,
        assignedFacultyId: input.assignedFacultyId || undefined,
        status: finalInitialStatus,
        version: 1,
        academicYear: '2025-2026',
        members,
      });

      await propDoc.save({ session });

      await AuditLog.create(
        [
          {
            userId: studentUserId,
            action: 'PROPOSAL_CREATED',
            entityType: 'PROPOSAL',
            entityId: propDoc.id,
            details: { title: input.title, initialStatus: finalInitialStatus },
          },
        ],
        { session }
      );

      return propDoc.id;
    });

    logger.info(`[ProposalService] Proposal ${createdProposalId} created by student ${studentUserId}`);
    return this.getProposalById(createdProposalId);
  }

  /**
   * List proposals visible to the user based on role
   */
  async getProposalsForUser(userId: string, role: string): Promise<ProposalDetail[]> {
    let proposalDocs = [];

    if (role === 'STUDENT') {
      proposalDocs = await Proposal.find({
        $or: [{ submittedBy: userId }, { 'members.studentId': userId }],
      }).sort({ createdAt: -1 });
    } else if (role === 'FACULTY') {
      const facultyUser = await User.findById(userId);
      const deptStudents = facultyUser?.departmentId
        ? await User.find({ departmentId: facultyUser.departmentId, role: 'STUDENT' }).select('_id')
        : [];
      const deptStudentIds = deptStudents.map((s) => s.id);

      proposalDocs = await Proposal.find({
        $or: [
          { assignedFacultyId: userId },
          {
            assignedFacultyId: { $in: [null, undefined] },
            submittedBy: { $in: deptStudentIds },
            status: { $ne: 'DRAFT' },
          },
        ],
      }).sort({ createdAt: -1 });
    } else {
      // ADMIN
      proposalDocs = await Proposal.find({}).sort({ createdAt: -1 });
    }

    const proposals: ProposalDetail[] = [];
    for (const doc of proposalDocs) {
      const p = await this.getProposalById(doc.id);
      proposals.push(p);
    }
    return proposals;
  }

  /**
   * Retrieve complete proposal details including members, submitter, and supervisor info
   */
  async getProposalById(proposalId: string): Promise<ProposalDetail> {
    const prop = await Proposal.findById(proposalId);
    if (!prop) {
      throw ApiError.notFound(`Proposal with ID ${proposalId} not found.`);
    }

    const submitter = await User.findById(prop.submittedBy);
    const subDept = submitter?.departmentId ? await Department.findById(submitter.departmentId) : null;

    let assignedFaculty = null;
    if (prop.assignedFacultyId) {
      const fac = await User.findById(prop.assignedFacultyId);
      if (fac) {
        const facDept = fac.departmentId ? await Department.findById(fac.departmentId) : null;
        assignedFaculty = {
          id: fac.id,
          name: `${fac.firstName} ${fac.lastName}`,
          email: fac.email,
          designation: fac.facultyProfile?.designation || 'Faculty Advisor',
          departmentCode: facDept?.code || 'AIDS',
        };
      }
    }

    // Check linked project
    const project = await Project.findOne({ proposalId: prop.id });

    // Format members
    const members: ProposalMemberItem[] = await Promise.all(
      (prop.members || []).map(async (m, idx) => {
        const u = await User.findById(m.studentId);
        return {
          id: m._id ? String(m._id) : (idx + 1),
          studentId: m.studentId,
          name: u ? `${u.firstName} ${u.lastName}` : 'Student',
          email: u?.email || '',
          rollNumber: u?.studentProfile?.rollNumber || '',
          semester: u?.studentProfile?.semester || 1,
          status: m.status,
          isLead: m.studentId === prop.submittedBy,
          joinedAt: toIsoString(m.joinedAt),
        };
      })
    );

    return {
      id: prop.id,
      title: prop.title,
      abstract: prop.abstract,
      domain: prop.domain,
      techStack: Array.isArray(prop.techStack) ? prop.techStack : [],
      submittedBy: {
        id: prop.submittedBy,
        name: submitter ? `${submitter.firstName} ${submitter.lastName}` : 'Student',
        email: submitter?.email || '',
        rollNumber: submitter?.studentProfile?.rollNumber || '',
        departmentCode: subDept?.code || 'AIDS',
      },
      assignedFaculty,
      status: prop.status,
      facultyComments: prop.facultyComments || null,
      version: prop.version,
      academicYear: prop.academicYear,
      createdAt: toIsoString(prop.createdAt),
      updatedAt: toIsoString(prop.updatedAt),
      members,
      projectId: project ? project.id : prop.projectId || null,
    };
  }

  /**
   * Update proposal details (allowed in DRAFT or CHANGES_REQUESTED by submitter)
   */
  async updateProposal(
    proposalId: string,
    studentUserId: string,
    input: UpdateProposalInput
  ): Promise<ProposalDetail> {
    const prop = await Proposal.findById(proposalId);
    if (!prop) {
      throw ApiError.notFound('Proposal not found');
    }

    if (prop.submittedBy !== studentUserId) {
      throw ApiError.forbidden('Only the student team lead who authored this proposal can modify it.');
    }

    if (prop.status !== 'DRAFT' && prop.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest(
        `Cannot edit proposal in "${prop.status}" status. Modifications are only permitted during DRAFT or CHANGES_REQUESTED stages.`
      );
    }

    if (input.title !== undefined) prop.title = input.title;
    if (input.abstract !== undefined) prop.abstract = input.abstract;
    if (input.domain !== undefined) prop.domain = input.domain;
    if (input.techStack !== undefined) prop.techStack = input.techStack;
    if (input.assignedFacultyId !== undefined) prop.assignedFacultyId = input.assignedFacultyId || undefined;

    await prop.save();

    logger.info(`[ProposalService] Proposal ${proposalId} updated by student ${studentUserId}`);
    return this.getProposalById(proposalId);
  }

  /**
   * Submit / Resubmit proposal for faculty review
   */
  async submitProposal(proposalId: string, studentUserId: string): Promise<ProposalDetail> {
    const prop = await Proposal.findById(proposalId);
    if (!prop) {
      throw ApiError.notFound('Proposal not found');
    }

    if (prop.submittedBy !== studentUserId) {
      throw ApiError.forbidden('Only the student team lead can submit this proposal.');
    }

    if (prop.status !== 'DRAFT' && prop.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest(`Proposal cannot be submitted from current status "${prop.status}".`);
    }

    // Verify team members satisfy minimum threshold
    const settings = await this.getSystemSettings();
    const acceptedCount = (prop.members || []).filter((m) => m.status === 'ACCEPTED').length;
    if (acceptedCount < settings.minTeamSize) {
      throw ApiError.badRequest(
        `Proposal requires at least ${settings.minTeamSize} confirmed team member(s). Currently confirmed: ${acceptedCount}.`
      );
    }

    const isResubmission = prop.status === 'CHANGES_REQUESTED';
    const newVersion = isResubmission ? prop.version + 1 : prop.version;
    const nextStatus = prop.assignedFacultyId ? 'UNDER_REVIEW' : 'SUBMITTED';

    prop.status = nextStatus;
    prop.version = newVersion;
    await prop.save();

    await AuditLog.create({
      userId: studentUserId,
      action: isResubmission ? 'PROPOSAL_RESUBMITTED' : 'PROPOSAL_SUBMITTED',
      entityType: 'PROPOSAL',
      entityId: proposalId,
      details: { newVersion, nextStatus },
    });

    logger.info(`[ProposalService] Proposal ${proposalId} submitted by student ${studentUserId} (Status: ${nextStatus}, v${newVersion})`);
    return this.getProposalById(proposalId);
  }

  /**
   * Faculty Appraisal: Approve, Request Changes, or Reject
   * Auto-instantiates Project, Project Members, and Default Milestones upon APPROVAL.
   */
  async reviewProposal(
    proposalId: string,
    evaluatorUserId: string,
    evaluatorRole: string,
    input: ReviewProposalInput
  ): Promise<{ proposal: ProposalDetail; instantiatedProjectId?: string }> {
    if (evaluatorRole !== 'FACULTY' && evaluatorRole !== 'ADMIN') {
      throw ApiError.forbidden('Only academic faculty and administrators can review project proposals.');
    }

    const prop = await this.getProposalById(proposalId);

    if (prop.status === 'DRAFT') {
      throw ApiError.badRequest('Cannot review a proposal that is still in draft state.');
    }
    if (prop.status === 'APPROVED') {
      throw ApiError.badRequest('Proposal has already been approved and active project instantiated.');
    }

    const guideId = prop.assignedFaculty?.id || evaluatorUserId;

    if (input.status === 'APPROVED') {
      // 1. Check Faculty Supervising Capacity Quota
      const facUser = await User.findById(guideId);
      const maxQuota = facUser?.facultyProfile?.maxProjects ?? 5;

      const currentlyAssigned = await Project.countDocuments({
        facultyGuideId: guideId,
        status: { $nin: ['COMPLETED', 'ARCHIVED'] },
      });

      if (currentlyAssigned >= maxQuota) {
        throw ApiError.badRequest(
          `Faculty guide has reached the maximum supervising quota (${currentlyAssigned}/${maxQuota}). Please reassign or increase capacity before approval.`
        );
      }

      // 2. Atomic Auto-Instantiation Transaction
      const instantiatedProjectId = await withMongoTransaction(async (session) => {
        // A. Update proposal to APPROVED
        const propDoc = await Proposal.findById(proposalId).session(session);
        if (!propDoc) throw ApiError.notFound('Proposal not found');

        propDoc.status = 'APPROVED';
        propDoc.facultyComments = input.facultyComments;
        propDoc.assignedFacultyId = guideId;
        await propDoc.save({ session });

        // B. Populate team members from accepted proposal members
        const teamMembers = prop.members
          .filter((m) => m.status === 'ACCEPTED')
          .map((m) => ({
            _id: crypto.randomUUID(),
            studentId: m.studentId,
            roleInProject: (m.studentId === prop.submittedBy.id ? 'LEAD' : 'MEMBER') as 'LEAD' | 'MEMBER',
            joinedAt: new Date(),
          }));

        // C. Instantiate 5 Standard Milestone Gates
        const now = new Date();
        const addDays = (d: Date, days: number): Date => {
          const t = new Date(d);
          t.setDate(t.getDate() + days);
          return t;
        };

        const standardMilestones = [
          {
            _id: crypto.randomUUID(),
            milestoneNumber: 1,
            title: 'Requirement Analysis & Literature Review',
            description: 'System Requirement Specification (SRS), formal domain feasibility study, and literature survey benchmark.',
            startDate: addDays(now, 0),
            dueDate: addDays(now, 30),
            status: 'PENDING' as const,
            completionPercentage: 0,
          },
          {
            _id: crypto.randomUUID(),
            milestoneNumber: 2,
            title: 'System Architecture & Detailed Design',
            description: 'Comprehensive architectural blueprint, database relational modeling, and API contract specifications.',
            startDate: addDays(now, 30),
            dueDate: addDays(now, 60),
            status: 'PENDING' as const,
            completionPercentage: 0,
          },
          {
            _id: crypto.randomUUID(),
            milestoneNumber: 3,
            title: 'Core Module Implementation & Integration',
            description: 'Algorithmic development, neural model training or core service pipeline, and full-stack API integration.',
            startDate: addDays(now, 60),
            dueDate: addDays(now, 105),
            status: 'PENDING' as const,
            completionPercentage: 0,
          },
          {
            _id: crypto.randomUUID(),
            milestoneNumber: 4,
            title: 'Testing, Benchmarking & Performance Optimization',
            description: 'System integration verification, accuracy benchmarking, latency profiling, and unit/regression test execution.',
            startDate: addDays(now, 105),
            dueDate: addDays(now, 135),
            status: 'PENDING' as const,
            completionPercentage: 0,
          },
          {
            _id: crypto.randomUUID(),
            milestoneNumber: 5,
            title: 'Final Thesis Documentation & Viva Defense',
            description: 'Complete capstone documentation, presentation deck preparation, code repository archiving, and final viva voce.',
            startDate: addDays(now, 135),
            dueDate: addDays(now, 160),
            status: 'PENDING' as const,
            completionPercentage: 0,
          },
        ];

        // D. Create Project
        const newProject = new Project({
          proposalId: propDoc.id,
          title: propDoc.title,
          abstract: propDoc.abstract,
          domain: propDoc.domain,
          facultyGuideId: guideId,
          status: 'ALLOCATED',
          overallProgress: 0,
          teamMembers,
          milestones: standardMilestones,
        });

        await newProject.save({ session });

        // Update proposal with linked project id
        propDoc.projectId = newProject.id;
        await propDoc.save({ session });

        // E. Audit log
        await AuditLog.create(
          [
            {
              userId: evaluatorUserId,
              action: 'PROPOSAL_APPROVED_AND_PROJECT_ALLOCATED',
              entityType: 'PROJECT',
              entityId: newProject.id,
              details: {
                proposalId,
                guideId,
                membersCount: teamMembers.length,
              },
            },
          ],
          { session }
        );

        return newProject.id;
      });

      logger.info(`[ProposalService] Proposal ${proposalId} APPROVED by ${evaluatorUserId}. Instantiated active project ${instantiatedProjectId}`);
      const updatedProp = await this.getProposalById(proposalId);
      return { proposal: updatedProp, instantiatedProjectId };
    }

    // For CHANGES_REQUESTED or REJECTED
    const propDoc = await Proposal.findById(proposalId);
    if (!propDoc) throw ApiError.notFound('Proposal not found');

    propDoc.status = input.status;
    propDoc.facultyComments = input.facultyComments;
    await propDoc.save();

    await AuditLog.create({
      userId: evaluatorUserId,
      action: `PROPOSAL_${input.status}`,
      entityType: 'PROPOSAL',
      entityId: proposalId,
      details: { comments: input.facultyComments },
    });

    logger.info(`[ProposalService] Proposal ${proposalId} evaluated as ${input.status} by ${evaluatorUserId}`);
    const updatedProp = await this.getProposalById(proposalId);
    return { proposal: updatedProp };
  }

  /**
   * Add / Invite a prospective team member to a proposal
   */
  async addProposalMember(
    proposalId: string,
    requesterUserId: string,
    newStudentId: string
  ): Promise<ProposalDetail> {
    const prop = await Proposal.findById(proposalId);
    if (!prop) throw ApiError.notFound('Proposal not found');

    if (prop.submittedBy !== requesterUserId) {
      throw ApiError.forbidden('Only the student team lead can invite members to this proposal.');
    }

    if (prop.status !== 'DRAFT' && prop.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest('Team members can only be added while proposal is in DRAFT or CHANGES_REQUESTED.');
    }

    // Check student validity
    const student = await User.findOne({ _id: newStudentId, role: 'STUDENT' });
    if (!student) {
      throw ApiError.badRequest('Target candidate is not an enrolled student.');
    }

    // Check system max team size
    const settings = await this.getSystemSettings();
    if (prop.members.length >= settings.maxTeamSize) {
      throw ApiError.badRequest(
        `Cannot add member. Team size has already reached the maximum limit of ${settings.maxTeamSize} members.`
      );
    }

    // Check duplicate
    const alreadyMember = prop.members.some((m) => m.studentId === newStudentId);
    if (alreadyMember) {
      throw ApiError.badRequest('This student is already a member or invited to this proposal.');
    }

    prop.members.push({
      _id: crypto.randomUUID(),
      studentId: newStudentId,
      status: 'INVITED',
      isLead: false,
      joinedAt: new Date(),
    });

    await prop.save();

    logger.info(`[ProposalService] Student ${newStudentId} invited to proposal ${proposalId}`);
    return this.getProposalById(proposalId);
  }

  /**
   * Respond to a team member invitation (ACCEPTED / DECLINED)
   */
  async respondToInvitation(
    proposalId: string,
    studentUserId: string,
    decision: 'ACCEPTED' | 'DECLINED'
  ): Promise<ProposalDetail> {
    const prop = await Proposal.findById(proposalId);
    if (!prop) throw ApiError.notFound('Proposal not found');

    const member = prop.members.find((m) => m.studentId === studentUserId);
    if (!member) {
      throw ApiError.notFound('Invitation record not found for this proposal.');
    }

    member.status = decision;
    await prop.save();

    logger.info(`[ProposalService] Student ${studentUserId} responded ${decision} to proposal ${proposalId}`);
    return this.getProposalById(proposalId);
  }

  /**
   * Remove a member from a proposal
   */
  async removeProposalMember(
    proposalId: string,
    requesterUserId: string,
    targetStudentId: string
  ): Promise<ProposalDetail> {
    const prop = await Proposal.findById(proposalId);
    if (!prop) throw ApiError.notFound('Proposal not found');

    const isLead = prop.submittedBy === requesterUserId;
    const isSelf = requesterUserId === targetStudentId;

    if (!isLead && !isSelf) {
      throw ApiError.forbidden('You do not have permission to remove this member.');
    }

    if (targetStudentId === prop.submittedBy) {
      throw ApiError.badRequest('The student team lead cannot be removed from their own proposal.');
    }

    if (prop.status !== 'DRAFT' && prop.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest('Members can only be removed while proposal is in DRAFT or CHANGES_REQUESTED.');
    }

    prop.members = prop.members.filter((m) => m.studentId !== targetStudentId);
    await prop.save();

    logger.info(`[ProposalService] Student ${targetStudentId} removed from proposal ${proposalId}`);
    return this.getProposalById(proposalId);
  }

  /**
   * Get active project details
   */
  async getProjectById(projectId: string): Promise<unknown> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound(`Project with ID ${projectId} not found.`);
    }

    const guide = await User.findById(project.facultyGuideId);
    const guideDept = guide?.departmentId ? await Department.findById(guide.departmentId) : null;

    const members = await Promise.all(
      (project.teamMembers || []).map(async (pm, idx) => {
        const u = await User.findById(pm.studentId);
        return {
          id: pm._id ? String(pm._id) : idx + 1,
          studentId: pm.studentId,
          name: u ? `${u.firstName} ${u.lastName}` : 'Student',
          email: u?.email || '',
          rollNumber: u?.studentProfile?.rollNumber || '',
          semester: u?.studentProfile?.semester || 1,
          roleInProject: pm.roleInProject,
          joinedAt: toIsoString(pm.joinedAt),
        };
      })
    );

    const milestones = (project.milestones || [])
      .sort((a, b) => a.milestoneNumber - b.milestoneNumber)
      .map((m) => ({
        id: m._id ? String(m._id) : String(m.milestoneNumber),
        milestoneNumber: m.milestoneNumber,
        title: m.title,
        description: m.description,
        startDate: toDateString(m.startDate),
        dueDate: toDateString(m.dueDate),
        completionPercentage: m.completionPercentage || 0,
        status: m.status,
        studentRemarks: m.studentRemarks || null,
        facultyRemarks: m.facultyRemarks || null,
        completedAt: m.completedAt ? toIsoString(m.completedAt) : null,
      }));

    return {
      id: project.id,
      proposalId: project.proposalId,
      title: project.title,
      abstract: project.abstract,
      domain: project.domain,
      facultyGuide: {
        id: guide?.id || '',
        name: guide ? `${guide.firstName} ${guide.lastName}` : 'Unassigned',
        email: guide?.email || '',
        designation: guide?.facultyProfile?.designation || 'Faculty Supervisor',
        departmentCode: guideDept?.code || 'AIDS',
      },
      status: project.status,
      overallProgress: project.overallProgress || 0,
      repositoryUrl: project.repositoryUrl || null,
      createdAt: toIsoString(project.createdAt),
      updatedAt: toIsoString(project.updatedAt),
      members,
      milestones,
    };
  }

  /**
   * Update project repository URL
   */
  async updateProjectRepo(
    projectId: string,
    userId: string,
    userRole: string,
    repositoryUrl: string
  ): Promise<void> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (userRole === 'STUDENT') {
      const isMember = (project.teamMembers || []).some((m) => m.studentId === userId);
      if (!isMember) {
        throw ApiError.forbidden('Only allocated team members can update the project repository URL.');
      }
    } else if (userRole === 'FACULTY') {
      if (project.facultyGuideId !== userId) {
        throw ApiError.forbidden('Only the assigned faculty supervisor can update project settings.');
      }
    }

    project.repositoryUrl = repositoryUrl;
    await project.save();

    logger.info(`[ProposalService] Project ${projectId} repository URL updated to "${repositoryUrl}" by user ${userId}`);
  }
}

export const proposalService = new ProposalService();
