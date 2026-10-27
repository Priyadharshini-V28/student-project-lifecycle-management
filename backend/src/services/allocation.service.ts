import { User, Project, Proposal, Department, AuditLog } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import crypto from 'crypto';

export interface ActiveProjectSummary {
  id: string;
  title: string;
  domain: string;
  status: string;
  overallProgress: number;
  leadStudentName?: string;
}

export interface FacultyCapacityItem {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  specialization: string;
  departmentId?: number;
  departmentCode?: string;
  maxProjects: number;
  currentlyAssigned: number;
  remainingCapacity: number;
  utilizationRate: number;
  status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL';
  activeProjects: ActiveProjectSummary[];
  pendingProposalsCount: number;
}

export interface AllocationMatrixResponse {
  summary: {
    totalFaculty: number;
    totalCapacity: number;
    totalAssigned: number;
    availableSlots: number;
    overallUtilization: number;
  };
  faculty: FacultyCapacityItem[];
}

export interface GuideRecommendation {
  facultyId: string;
  name: string;
  designation: string;
  specialization: string;
  departmentCode: string;
  maxProjects: number;
  currentlyAssigned: number;
  remainingCapacity: number;
  matchScore: number;
  matchedKeywords: string[];
  recommendationReason: string;
}

export class AllocationService {
  /**
   * Departmental / Institutional Faculty Capacity Matrix
   */
  async getFacultyAllocationMatrix(departmentId?: number): Promise<AllocationMatrixResponse> {
    const query: Record<string, unknown> = {
      role: 'FACULTY',
      isActive: { $ne: false },
    };

    if (departmentId) {
      query.departmentId = departmentId;
    }

    const facultyUsers = await User.find(query).sort({ lastName: 1, firstName: 1 });
    const departments = await Department.find();
    const deptMap = new Map(departments.map((d) => [d._id, d.code]));

    const facultyItems: FacultyCapacityItem[] = await Promise.all(
      facultyUsers.map(async (faculty) => {
        const facId = faculty.id;
        const maxProjects = faculty.facultyProfile?.maxProjects ?? 5;

        // Active projects: status not in COMPLETED, ARCHIVED
        const activeProjectsDocs = await Project.find({
          facultyGuideId: facId,
          status: { $nin: ['COMPLETED', 'ARCHIVED'] },
        }).sort({ updatedAt: -1 });

        const currentlyAssigned = activeProjectsDocs.length;
        const remainingCapacity = Math.max(0, maxProjects - currentlyAssigned);
        const utilizationRate = maxProjects > 0 ? Math.round((currentlyAssigned / maxProjects) * 100) : 100;

        let status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL' = 'AVAILABLE';
        if (currentlyAssigned >= maxProjects) {
          status = 'FULL';
        } else if (remainingCapacity === 1) {
          status = 'NEAR_CAPACITY';
        }

        // Resolve lead student names for active projects
        const activeProjects: ActiveProjectSummary[] = await Promise.all(
          activeProjectsDocs.map(async (p) => {
            const leadMember = p.teamMembers?.find((m) => m.roleInProject === 'LEAD') || p.teamMembers?.[0];
            let leadStudentName = 'Unassigned';
            if (leadMember) {
              const student = await User.findById(leadMember.studentId);
              if (student) {
                leadStudentName = `${student.firstName} ${student.lastName}`;
              }
            }
            return {
              id: p.id,
              title: p.title,
              domain: p.domain,
              status: p.status,
              overallProgress: p.overallProgress || 0,
              leadStudentName,
            };
          })
        );

        // Pending proposals count awaiting review by this faculty
        const pendingProposalsCount = await Proposal.countDocuments({
          assignedFacultyId: facId,
          status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] },
        });

        return {
          id: facId,
          name: `${faculty.firstName} ${faculty.lastName}`,
          email: faculty.email,
          employeeId: faculty.facultyProfile?.employeeId || 'N/A',
          designation: faculty.facultyProfile?.designation || 'Faculty Member',
          specialization: faculty.facultyProfile?.specialization || 'General Computer Science',
          departmentId: faculty.departmentId,
          departmentCode: faculty.departmentId ? deptMap.get(faculty.departmentId) || 'AIDS' : 'AIDS',
          maxProjects,
          currentlyAssigned,
          remainingCapacity,
          utilizationRate,
          status,
          activeProjects,
          pendingProposalsCount,
        };
      })
    );

    const totalFaculty = facultyItems.length;
    const totalCapacity = facultyItems.reduce((acc, f) => acc + f.maxProjects, 0);
    const totalAssigned = facultyItems.reduce((acc, f) => acc + f.currentlyAssigned, 0);
    const availableSlots = Math.max(0, totalCapacity - totalAssigned);
    const overallUtilization = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

    return {
      summary: {
        totalFaculty,
        totalCapacity,
        totalAssigned,
        availableSlots,
        overallUtilization,
      },
      faculty: facultyItems,
    };
  }

  /**
   * Retrieve unallocated / pending items for quick assignment
   */
  async getUnallocatedItems(): Promise<{
    pendingProposals: unknown[];
    activeProjects: unknown[];
  }> {
    const proposals = await Proposal.find({
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] },
    }).sort({ createdAt: -1 });

    const pendingProposals = await Promise.all(
      proposals.map(async (prop) => {
        const leadUser = await User.findById(prop.submittedBy);
        const assignedUser = prop.assignedFacultyId ? await User.findById(prop.assignedFacultyId) : null;
        return {
          id: prop.id,
          title: prop.title,
          domain: prop.domain,
          status: prop.status,
          leadStudent: leadUser ? `${leadUser.firstName} ${leadUser.lastName}` : 'Unknown',
          assignedFaculty: assignedUser
            ? { id: assignedUser.id, name: `${assignedUser.firstName} ${assignedUser.lastName}` }
            : null,
          createdAt: prop.createdAt,
        };
      })
    );

    const projects = await Project.find({
      status: { $nin: ['COMPLETED', 'ARCHIVED'] },
    }).sort({ createdAt: -1 });

    const activeProjects = await Promise.all(
      projects.map(async (proj) => {
        const guide = await User.findById(proj.facultyGuideId);
        const leadMember = proj.teamMembers?.find((m) => m.roleInProject === 'LEAD');
        const leadUser = leadMember ? await User.findById(leadMember.studentId) : null;
        return {
          id: proj.id,
          title: proj.title,
          domain: proj.domain,
          status: proj.status,
          overallProgress: proj.overallProgress,
          currentGuide: guide ? { id: guide.id, name: `${guide.firstName} ${guide.lastName}` } : null,
          leadStudent: leadUser ? `${leadUser.firstName} ${leadUser.lastName}` : 'Unknown',
        };
      })
    );

    return { pendingProposals, activeProjects };
  }

  /**
   * Reassign project guide with workload guard and audit logging
   */
  async reassignProjectGuide(
    projectId: string,
    newFacultyGuideId: string,
    requesterUserId: string,
    requesterRole: string,
    reason: string
  ): Promise<{
    project: unknown;
    auditLogId: string;
  }> {
    if (requesterRole !== 'ADMIN' && requesterRole !== 'FACULTY') {
      throw ApiError.forbidden('Only academic administrators and faculty supervisors can reallocate project guides.');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound(`Project with ID ${projectId} not found.`);
    }

    if (requesterRole === 'FACULTY' && project.facultyGuideId !== requesterUserId) {
      throw ApiError.forbidden('Faculty supervisors can only initiate guide reallocation for their own assigned projects.');
    }

    // Role Boundary & Existence Guard
    const targetFaculty = await User.findById(newFacultyGuideId);
    if (!targetFaculty) {
      throw ApiError.notFound('Target faculty member not found.');
    }

    if (targetFaculty.role !== 'FACULTY' && targetFaculty.role !== 'ADMIN') {
      throw ApiError.badRequest('Target user must be a faculty member or academic administrator. Students cannot supervise projects.');
    }

    if (targetFaculty.isActive === false) {
      throw ApiError.badRequest('Target faculty member account is inactive and cannot accept project allocations.');
    }

    if (project.facultyGuideId === newFacultyGuideId) {
      throw ApiError.badRequest('Project is already assigned to this faculty guide.');
    }

    // Workload Guard: Check target faculty capacity
    const maxQuota = targetFaculty.facultyProfile?.maxProjects ?? 5;
    const currentlyAssigned = await Project.countDocuments({
      facultyGuideId: newFacultyGuideId,
      status: { $nin: ['COMPLETED', 'ARCHIVED'] },
    });

    if (currentlyAssigned >= maxQuota) {
      throw ApiError.badRequest(
        `Target faculty member Dr./Prof. ${targetFaculty.lastName} has reached maximum supervising capacity (${currentlyAssigned}/${maxQuota} projects). Reallocation rejected.`
      );
    }

    const previousGuideId = project.facultyGuideId;
    project.facultyGuideId = newFacultyGuideId;
    await project.save();

    // If linked proposal exists, sync its assignedFacultyId as well
    if (project.proposalId) {
      await Proposal.findByIdAndUpdate(project.proposalId, { assignedFacultyId: newFacultyGuideId });
    }

    // Immutable Audit Trail
    const auditRecord = await AuditLog.create({
      userId: requesterUserId,
      action: 'PROJECT_GUIDE_REALLOCATED',
      entityType: 'PROJECT',
      entityId: projectId,
      details: {
        previousFacultyGuideId: previousGuideId,
        newFacultyGuideId,
        reason,
        requesterRole,
      },
    });

    logger.info(
      `[AllocationService] Project ${projectId} reallocated from ${previousGuideId} to ${newFacultyGuideId} by ${requesterUserId}. Reason: "${reason}"`
    );

    // Notify new faculty guide and student team
    try {
      const studentIds = project.teamMembers?.map((m) => m.studentId) || [];
      await notificationService.createNotification({
        recipientId: newFacultyGuideId,
        type: 'SYSTEM_ALERT',
        title: 'Project Supervisor Reassigned',
        message: `You have been assigned as the faculty supervisor for project "${project.title}".`,
        projectId: project.id,
        link: `/projects/${project.id}`,
        idempotencyKey: `project-reassign-${project.id}-${newFacultyGuideId}`,
      });

      const requesterUser = await User.findById(requesterUserId);
      const requesterName = requesterUser ? `${requesterUser.firstName} ${requesterUser.lastName}` : 'Administrator';
      for (const sId of studentIds) {
        await notificationService.createNotification({
          recipientId: sId,
          type: 'SYSTEM_ALERT',
          title: 'Project Supervisor Updated',
          message: `Faculty supervisor Dr./Prof. ${targetFaculty.lastName} has been assigned to your project "${project.title}".`,
          projectId: project.id,
          link: `/projects/${project.id}`,
          idempotencyKey: `project-reassign-student-${project.id}-${sId}-${newFacultyGuideId}`,
        });
      }
    } catch (notifErr) {
      logger.warn('[AllocationService] Reallocation notification skipped/failed:', notifErr);
    }

    return {
      project: {
        id: project.id,
        title: project.title,
        facultyGuideId: project.facultyGuideId,
        status: project.status,
      },
      auditLogId: auditRecord.id,
    };
  }

  /**
   * Assign or reassign proposal guide with workload guard, project auto-allocation, and audit logging
   */
  async assignProposalGuide(
    proposalId: string,
    facultyId: string,
    requesterUserId: string,
    requesterRole: string,
    allocateProject: boolean = true
  ): Promise<unknown> {
    if (requesterRole !== 'ADMIN' && requesterRole !== 'FACULTY') {
      throw ApiError.forbidden('Only academic administrators and faculty can assign proposal supervisors.');
    }

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      throw ApiError.notFound(`Proposal with ID ${proposalId} not found.`);
    }

    const targetFaculty = await User.findById(facultyId);
    if (!targetFaculty) {
      throw ApiError.notFound('Target faculty member not found.');
    }

    if (targetFaculty.role !== 'FACULTY' && targetFaculty.role !== 'ADMIN') {
      throw ApiError.badRequest('Target user must be a faculty member or administrator.');
    }

    if (targetFaculty.isActive === false) {
      throw ApiError.badRequest('Target faculty member account is inactive and cannot accept project allocations.');
    }

    // Workload Guard: Check target faculty capacity
    const maxQuota = targetFaculty.facultyProfile?.maxProjects ?? 5;
    const currentlyAssigned = await Project.countDocuments({
      facultyGuideId: facultyId,
      status: { $nin: ['COMPLETED', 'ARCHIVED'] },
    });

    if (currentlyAssigned >= maxQuota) {
      throw ApiError.badRequest(
        `Target faculty member Dr./Prof. ${targetFaculty.lastName} has reached maximum supervising capacity (${currentlyAssigned}/${maxQuota} projects).`
      );
    }

    const previousAssigned = proposal.assignedFacultyId;
    proposal.assignedFacultyId = facultyId;

    let instantiatedProjectId = proposal.projectId || null;

    if (allocateProject) {
      // Check if project already exists for this proposal
      let existingProject = proposal.projectId ? await Project.findById(proposal.projectId) : null;
      if (!existingProject) {
        existingProject = await Project.findOne({ proposalId: proposal.id });
      }

      if (existingProject) {
        // Project already instantiated, update its faculty guide
        existingProject.facultyGuideId = facultyId;
        if (existingProject.status === 'UNDER_REVIEW' || existingProject.status === 'CHANGES_REQUESTED') {
          existingProject.status = 'ALLOCATED';
        }
        await existingProject.save();
        instantiatedProjectId = existingProject.id;
        proposal.projectId = existingProject.id;
        proposal.status = 'APPROVED';
      } else {
        // Instantiate new active Project
        const leadStudentId = proposal.submittedBy;
        const acceptedMembers = (proposal.members || []).filter((m) => m.status === 'ACCEPTED');
        const teamMemberIds = acceptedMembers.length > 0
          ? acceptedMembers.map((m) => m.studentId)
          : [leadStudentId];

        // Ensure lead is in teamMembers
        if (!teamMemberIds.includes(leadStudentId)) {
          teamMemberIds.unshift(leadStudentId);
        }

        const teamMembers = teamMemberIds.map((sId) => ({
          _id: crypto.randomUUID(),
          studentId: sId,
          roleInProject: (sId === leadStudentId ? 'LEAD' : 'MEMBER') as 'LEAD' | 'MEMBER',
          joinedAt: new Date(),
        }));

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

        const newProject = new Project({
          proposalId: proposal.id,
          title: proposal.title,
          abstract: proposal.abstract,
          domain: proposal.domain,
          subjectCode: proposal.subjectCode || 'CAPSTONE-01',
          subjectName: proposal.subjectName || 'Major Capstone Project',
          facultyGuideId: facultyId,
          status: 'ALLOCATED',
          overallProgress: 0,
          teamMembers,
          milestones: standardMilestones,
        });

        await newProject.save();
        instantiatedProjectId = newProject.id;
        proposal.projectId = newProject.id;
        proposal.status = 'APPROVED';
      }
    } else {
      if (proposal.status === 'SUBMITTED') {
        proposal.status = 'UNDER_REVIEW';
      }
    }

    await proposal.save();

    await AuditLog.create({
      userId: requesterUserId,
      action: allocateProject ? 'PROPOSAL_APPROVED_AND_PROJECT_ALLOCATED' : 'PROPOSAL_GUIDE_ASSIGNED',
      entityType: allocateProject ? 'PROJECT' : 'PROPOSAL',
      entityId: instantiatedProjectId || proposalId,
      details: {
        proposalId,
        previousAssignedFacultyId: previousAssigned,
        newAssignedFacultyId: facultyId,
        projectId: instantiatedProjectId,
        requesterRole,
      },
    });

    logger.info(
      `[AllocationService] Proposal ${proposalId} supervisor assigned to ${facultyId} by ${requesterUserId}${
        allocateProject ? ` (allocated project ${instantiatedProjectId})` : ''
      }`
    );

    // Send notifications to student team and faculty
    try {
      const studentIds = (proposal.members || []).map((m) => m.studentId);
      if (!studentIds.includes(proposal.submittedBy)) {
        studentIds.push(proposal.submittedBy);
      }
      const adminUser = await User.findById(requesterUserId);
      const adminName = adminUser ? `${adminUser.firstName} ${adminUser.lastName}` : 'Administrator';

      if (allocateProject && instantiatedProjectId) {
        await notificationService.notifyProposalReview({
          proposalId: proposal.id,
          title: proposal.title,
          version: proposal.version || 1,
          status: 'APPROVED',
          facultyComments: `Faculty supervisor assigned: Dr./Prof. ${targetFaculty.lastName}. Capstone project officially allocated.`,
          memberStudentIds: studentIds,
          evaluatorName: adminName,
          projectId: instantiatedProjectId,
        });

        await notificationService.createNotification({
          recipientId: facultyId,
          type: 'PROPOSAL_APPROVED',
          title: 'Capstone Project Assigned',
          message: `You have been designated as faculty supervisor for project "${proposal.title}".`,
          projectId: instantiatedProjectId,
          proposalId: proposal.id,
          link: `/projects/${instantiatedProjectId}`,
          idempotencyKey: `guide-assigned-${instantiatedProjectId}-${facultyId}`,
        });
      } else {
        await notificationService.notifyProposalSubmission({
          proposalId: proposal.id,
          title: proposal.title,
          version: proposal.version || 1,
          isResubmission: false,
          submitterName: 'Academic Administration',
          assignedFacultyId: facultyId,
        });
      }
    } catch (notifErr) {
      logger.warn('[AllocationService] Notification delivery skipped or failed:', notifErr);
    }

    return {
      id: proposal.id,
      title: proposal.title,
      assignedFacultyId: proposal.assignedFacultyId,
      status: proposal.status,
      projectId: instantiatedProjectId,
    };
  }

  /**
   * Update faculty supervising capacity quota (Admin privilege)
   */
  async updateFacultyCapacity(
    facultyUserId: string,
    maxProjects: number,
    adminUserId: string
  ): Promise<unknown> {
    const faculty = await User.findById(facultyUserId);
    if (!faculty) {
      throw ApiError.notFound('Faculty member not found.');
    }

    if (faculty.role !== 'FACULTY' && faculty.role !== 'ADMIN') {
      throw ApiError.badRequest('Capacity quotas can only be configured for faculty or administrator accounts.');
    }

    if (!faculty.facultyProfile) {
      faculty.facultyProfile = {};
    }

    const previousMax = faculty.facultyProfile.maxProjects || 5;
    faculty.facultyProfile.maxProjects = maxProjects;
    await faculty.save();

    await AuditLog.create({
      userId: adminUserId,
      action: 'FACULTY_CAPACITY_UPDATED',
      entityType: 'USER',
      entityId: facultyUserId,
      details: {
        previousMaxProjects: previousMax,
        newMaxProjects: maxProjects,
      },
    });

    logger.info(
      `[AllocationService] Faculty ${facultyUserId} capacity updated from ${previousMax} to ${maxProjects} by admin ${adminUserId}`
    );

    return {
      id: faculty.id,
      name: `${faculty.firstName} ${faculty.lastName}`,
      email: faculty.email,
      maxProjects: faculty.facultyProfile.maxProjects,
    };
  }

  /**
   * Smart Faculty Guide Recommendation / Ranking (Non-automatic, advisory only)
   * Analyzes domain keyword overlap against faculty specializations and balances against current workload.
   */
  async getRecommendedGuides(proposalOrProjectId: string): Promise<GuideRecommendation[]> {
    // 1. Resolve source item (either Proposal or Project)
    let domain = '';
    let title = '';
    let abstract = '';

    const proposal = await Proposal.findById(proposalOrProjectId);
    if (proposal) {
      domain = proposal.domain;
      title = proposal.title;
      abstract = proposal.abstract;
    } else {
      const project = await Project.findById(proposalOrProjectId);
      if (project) {
        domain = project.domain;
        title = project.title;
        abstract = project.abstract;
      } else {
        throw ApiError.notFound('Proposal or project not found for recommendation.');
      }
    }

    // 2. Tokenize project terms
    const stopWords = new Set([
      'and', 'the', 'for', 'with', 'using', 'via', 'from', 'into', 'this', 'that', 'system', 'based',
      'project', 'automated', 'high', 'across', 'multi', 'zero', 'shot', 'deep', 'learning',
    ]);

    const sanitizeTokens = (text: string): string[] =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

    const domainTokens = new Set([
      ...sanitizeTokens(domain),
      ...sanitizeTokens(title),
      ...sanitizeTokens(abstract).slice(0, 15),
    ]);

    // 3. Fetch active faculty and calculate scores
    const facultyUsers = await User.find({ role: 'FACULTY', isActive: { $ne: false } });
    const departments = await Department.find();
    const deptMap = new Map(departments.map((d) => [d._id, d.code]));

    const recommendations: GuideRecommendation[] = await Promise.all(
      facultyUsers.map(async (fac) => {
        const facId = fac.id;
        const maxProjects = fac.facultyProfile?.maxProjects ?? 5;
        const currentlyAssigned = await Project.countDocuments({
          facultyGuideId: facId,
          status: { $nin: ['COMPLETED', 'ARCHIVED'] },
        });
        const remainingCapacity = Math.max(0, maxProjects - currentlyAssigned);

        const specialization = fac.facultyProfile?.specialization || '';
        const specTokens = sanitizeTokens(specialization);

        const matchedKeywords: string[] = [];
        for (const st of specTokens) {
          if (domainTokens.has(st) || domain.toLowerCase().includes(st)) {
            matchedKeywords.push(st);
          }
        }

        // Domain similarity score (0 to 70 points)
        const domainMatchScore = Math.min(
          70,
          matchedKeywords.length * 25 + (specTokens.some((t) => domain.toLowerCase().includes(t)) ? 20 : 0)
        );

        // Capacity bonus (0 to 30 points)
        const capacityBonus = maxProjects > 0 ? Math.round((remainingCapacity / maxProjects) * 30) : 0;

        let totalScore = domainMatchScore + capacityBonus;
        // If no remaining capacity, penalize heavily
        if (remainingCapacity === 0) {
          totalScore = Math.round(totalScore * 0.2);
        }

        let recommendationReason = 'General advisory profile';
        if (matchedKeywords.length > 0 && remainingCapacity > 0) {
          recommendationReason = `High specialization alignment in [${matchedKeywords.join(', ')}] with ${remainingCapacity} available project slot(s).`;
        } else if (remainingCapacity > 0) {
          recommendationReason = `Available supervising capacity (${remainingCapacity}/${maxProjects} slots).`;
        } else {
          recommendationReason = 'Currently at maximum supervising capacity quota.';
        }

        return {
          facultyId: facId,
          name: `${fac.firstName} ${fac.lastName}`,
          designation: fac.facultyProfile?.designation || 'Faculty Member',
          specialization,
          departmentCode: fac.departmentId ? deptMap.get(fac.departmentId) || 'AIDS' : 'AIDS',
          maxProjects,
          currentlyAssigned,
          remainingCapacity,
          matchScore: Math.min(100, Math.max(0, totalScore)),
          matchedKeywords,
          recommendationReason,
        };
      })
    );

    // Sort by match score descending, then remaining capacity descending
    recommendations.sort((a, b) => b.matchScore - a.matchScore || b.remainingCapacity - a.remainingCapacity);

    return recommendations;
  }
}

export const allocationService = new AllocationService();
