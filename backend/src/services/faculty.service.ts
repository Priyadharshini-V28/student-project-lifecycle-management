import { User, Project, Review, Proposal, Department, AuditLog } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface FacultyDashboardDto {
  faculty: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    designation: string;
    specialization: string;
    departmentCode: string;
    departmentName: string;
  };
  metrics: {
    maxQuota: number;
    currentlyAssigned: number;
    remainingCapacity: number;
    capacityUtilizationPercentage: number;
    pendingReviewsCount: number;
    pendingResubmissionsCount: number;
    proposalsAwaitingReviewCount: number;
    evaluatedProjectsCount: number;
  };
  actionQueues: {
    pendingReviews: Array<{
      projectId: string;
      projectTitle: string;
      domain: string;
      status: string;
      studentLead: string;
      rollNumber: string;
      activeMilestoneNumber: number | null;
      activeMilestoneTitle: string | null;
      milestoneDueDate: string | null;
    }>;
    pendingResubmissions: Array<{
      resubmissionId: string;
      reviewId: string;
      projectId: string;
      projectTitle: string;
      studentLead: string;
      rollNumber: string;
      roundNumber: number;
      studentNotes: string;
      resubmittedAt: string;
      originalRequiredChanges: string | null;
    }>;
    pendingProposals: Array<{
      proposalId: string;
      title: string;
      domain: string;
      submittedByName: string;
      submittedByRoll: string;
      status: string;
      version: number;
      academicYear: string;
      createdAt: string;
    }>;
  };
  assignedProjects: Array<{
    id: string;
    title: string;
    abstract: string;
    domain: string;
    status: string;
    overallProgress: number;
    repositoryUrl: string | null;
    createdAt: string;
    studentLead: {
      id: string;
      name: string;
      email: string;
      rollNumber: string;
    };
    teamMembersCount: number;
    currentMilestone: {
      milestoneNumber: number;
      title: string;
      dueDate: string;
      status: string;
      completionPercentage: number;
      isOverdue: boolean;
    } | null;
    latestReview: {
      roundNumber: number;
      reviewDate: string;
      status: string;
      totalScore: number | null;
    } | null;
  }>;
}

const toIsoString = (val: unknown): string => {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
};

export class FacultyService {
  /**
   * Aggregates real-time supervisor workload, action-required queues, and assigned projects portfolio
   */
  async getFacultyDashboard(userId: string): Promise<FacultyDashboardDto> {
    // 1. Fetch faculty profile & quota settings
    const facultyUser = await User.findOne({ _id: userId, role: { $in: ['FACULTY', 'ADMIN'] } });

    if (!facultyUser) {
      throw ApiError.notFound('Faculty record not found or user is not a faculty member');
    }

    const dept = facultyUser.departmentId ? await Department.findById(facultyUser.departmentId) : null;
    const maxQuota = facultyUser.facultyProfile?.maxProjects || 5;

    // 2. Fetch all projects assigned to this faculty guide
    const projects = await Project.find({ facultyGuideId: userId });

    const statusWeight: Record<string, number> = {
      UNDER_REVIEW: 1,
      CHANGES_REQUESTED: 2,
      IN_PROGRESS: 3,
      ALLOCATED: 4,
      EVALUATED: 5,
    };

    projects.sort((a, b) => {
      const weightA = statusWeight[a.status] || 6;
      const weightB = statusWeight[b.status] || 6;
      if (weightA !== weightB) return weightA - weightB;
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });

    // 3. Enrich projects with team size, current milestone, and latest review
    const assignedProjects: FacultyDashboardDto['assignedProjects'] = [];
    const pendingReviewsQueue: FacultyDashboardDto['actionQueues']['pendingReviews'] = [];

    const today = new Date();

    for (const p of projects) {
      const teamMembersCount = p.teamMembers?.length || 1;

      // Find lead
      const leadMember = p.teamMembers?.find((m) => m.roleInProject === 'LEAD');
      const leadUser = leadMember ? await User.findById(leadMember.studentId) : null;
      const leadName = leadUser ? `${leadUser.firstName} ${leadUser.lastName}` : 'Unassigned';
      const leadRollNumber = leadUser?.studentProfile?.rollNumber || 'N/A';

      // Current active or next milestone
      const sortedMilestones = [...(p.milestones || [])].sort((a, b) => {
        const mStatusWeight: Record<string, number> = {
          IN_PROGRESS: 1,
          PENDING: 2,
          OVERDUE: 3,
        };
        const swA = mStatusWeight[a.status] || 4;
        const swB = mStatusWeight[b.status] || 4;
        if (swA !== swB) return swA - swB;
        return a.milestoneNumber - b.milestoneNumber;
      });

      let currentMilestone = null;
      if (sortedMilestones.length > 0) {
        const m = sortedMilestones[0];
        const isOverdue = m.status !== 'COMPLETED' && new Date(m.dueDate) < today;
        currentMilestone = {
          milestoneNumber: m.milestoneNumber,
          title: m.title,
          dueDate: toIsoString(m.dueDate),
          status: m.status,
          completionPercentage: m.completionPercentage || 0,
          isOverdue,
        };
      }

      // Latest review conducted
      const reviews = await Review.find({ projectId: p.id })
        .sort({ roundNumber: -1, createdAt: -1 })
        .limit(1);

      let latestReview = null;
      if (reviews.length > 0) {
        const r = reviews[0];
        latestReview = {
          roundNumber: r.roundNumber,
          reviewDate: toIsoString(r.reviewDate),
          status: r.status,
          totalScore: r.totalScore !== undefined ? Number(r.totalScore) : null,
        };
      }

      // If project status is UNDER_REVIEW, add to pendingReviews queue
      if (p.status === 'UNDER_REVIEW') {
        pendingReviewsQueue.push({
          projectId: p.id,
          projectTitle: p.title,
          domain: p.domain,
          status: p.status,
          studentLead: leadName,
          rollNumber: leadRollNumber,
          activeMilestoneNumber: currentMilestone?.milestoneNumber ?? null,
          activeMilestoneTitle: currentMilestone?.title ?? null,
          milestoneDueDate: currentMilestone?.dueDate ?? null,
        });
      }

      assignedProjects.push({
        id: p.id,
        title: p.title,
        abstract: p.abstract,
        domain: p.domain,
        status: p.status,
        overallProgress: p.overallProgress || 0,
        repositoryUrl: p.repositoryUrl || null,
        createdAt: toIsoString(p.createdAt),
        studentLead: {
          id: leadUser?.id || '',
          name: leadName,
          email: leadUser?.email || '',
          rollNumber: leadRollNumber,
        },
        teamMembersCount,
        currentMilestone,
        latestReview,
      });
    }

    // 4. Action Queue 2: Pending Student Resubmissions awaiting faculty re-evaluation
    const pendingResubmissions: FacultyDashboardDto['actionQueues']['pendingResubmissions'] = [];

    for (const p of projects) {
      const allReviews = await Review.find({ projectId: p.id }).sort({ roundNumber: 1 });

      const leadMember = p.teamMembers?.find((m) => m.roleInProject === 'LEAD');
      const leadUser = leadMember ? await User.findById(leadMember.studentId) : null;
      const leadName = leadUser ? `${leadUser.firstName} ${leadUser.lastName}` : 'Unassigned';
      const leadRollNumber = leadUser?.studentProfile?.rollNumber || 'N/A';

      for (const r of allReviews) {
        if (r.resubmissions && r.resubmissions.length > 0) {
          // Check if there is any subsequent review round
          const hasSubsequentReview = allReviews.some((nextR) => nextR.roundNumber > r.roundNumber);
          if (!hasSubsequentReview) {
            for (const resub of r.resubmissions) {
              pendingResubmissions.push({
                resubmissionId: resub._id ? String(resub._id) : String(r.id),
                reviewId: r.id,
                projectId: p.id,
                projectTitle: p.title,
                studentLead: leadName,
                rollNumber: leadRollNumber,
                roundNumber: r.roundNumber,
                studentNotes: resub.studentNotes,
                resubmittedAt: toIsoString(resub.resubmittedAt),
                originalRequiredChanges: r.requiredChanges || null,
              });
            }
          }
        }
      }
    }

    // Sort pending resubmissions by resubmittedAt DESC
    pendingResubmissions.sort((a, b) => new Date(b.resubmittedAt).getTime() - new Date(a.resubmittedAt).getTime());

    // 5. Action Queue 3: Student Proposals assigned to this faculty awaiting appraisal
    const proposals = await Proposal.find({
      assignedFacultyId: userId,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] },
    }).sort({ createdAt: -1 });

    const pendingProposals = await Promise.all(
      proposals.map(async (prop) => {
        const submitter = await User.findById(prop.submittedBy);
        return {
          proposalId: prop.id,
          title: prop.title,
          domain: prop.domain,
          submittedByName: submitter ? `${submitter.firstName} ${submitter.lastName}` : 'Student',
          submittedByRoll: submitter?.studentProfile?.rollNumber || 'N/A',
          status: prop.status,
          version: prop.version,
          academicYear: prop.academicYear,
          createdAt: toIsoString(prop.createdAt),
        };
      })
    );

    // 6. Aggregate KPIs
    const currentlyAssigned = assignedProjects.filter((p) =>
      ['ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(p.status)
    ).length;

    const evaluatedProjectsCount = assignedProjects.filter((p) =>
      ['EVALUATED', 'COMPLETED'].includes(p.status)
    ).length;

    const remainingCapacity = Math.max(0, maxQuota - currentlyAssigned);
    const capacityUtilizationPercentage =
      maxQuota > 0 ? Math.round((currentlyAssigned / maxQuota) * 100) : 0;

    logger.debug(`[FacultyDashboard] Aggregated metrics calculated for faculty ID: ${userId}`);

    return {
      faculty: {
        id: facultyUser.id,
        firstName: facultyUser.firstName,
        lastName: facultyUser.lastName,
        email: facultyUser.email,
        employeeId: facultyUser.facultyProfile?.employeeId || '',
        designation: facultyUser.facultyProfile?.designation || 'Faculty Supervisor',
        specialization: facultyUser.facultyProfile?.specialization || 'Computer Science',
        departmentCode: dept?.code || 'AIDS',
        departmentName: dept?.name || 'Department of Artificial Intelligence & Data Science',
      },
      metrics: {
        maxQuota,
        currentlyAssigned,
        remainingCapacity,
        capacityUtilizationPercentage,
        pendingReviewsCount: pendingReviewsQueue.length,
        pendingResubmissionsCount: pendingResubmissions.length,
        proposalsAwaitingReviewCount: pendingProposals.length,
        evaluatedProjectsCount,
      },
      actionQueues: {
        pendingReviews: pendingReviewsQueue,
        pendingResubmissions,
        pendingProposals,
      },
      assignedProjects,
    };
  }

  /**
   * Fetch all active faculty members for guide allocation and proposal selection
   */
  async getFacultyDirectory(departmentId?: number): Promise<unknown[]> {
    const query: Record<string, unknown> = { role: 'FACULTY', isActive: { $ne: false } };
    if (departmentId) query.departmentId = departmentId;

    const facultyDocs = await User.find(query).sort({ lastName: 1, firstName: 1 });
    const depts = await Department.find();
    const deptMap = new Map(depts.map((d) => [d._id, d.code]));

    return Promise.all(
      facultyDocs.map(async (f) => {
        const maxQuota = f.facultyProfile?.maxProjects ?? 5;
        const currentlyAssigned = await Project.countDocuments({
          facultyGuideId: f.id,
          status: { $nin: ['COMPLETED', 'ARCHIVED'] },
        });

        return {
          id: f.id,
          name: `${f.firstName} ${f.lastName}`,
          email: f.email,
          employeeId: f.facultyProfile?.employeeId || '',
          designation: f.facultyProfile?.designation || 'Faculty Member',
          specialization: f.facultyProfile?.specialization || '',
          departmentId: f.departmentId,
          departmentCode: f.departmentId ? deptMap.get(f.departmentId) || 'AIDS' : 'AIDS',
          maxProjects: maxQuota,
          currentlyAssigned,
          remainingCapacity: Math.max(0, maxQuota - currentlyAssigned),
          isAvailable: currentlyAssigned < maxQuota,
        };
      })
    );
  }

  /**
   * Update faculty member research specialization (Admin privilege)
   */
  async updateFacultySpecialization(
    facultyId: string,
    specialization: string,
    adminUserId?: string
  ): Promise<unknown> {
    const actorId = adminUserId || 'a0000000-0000-0000-0000-000000000001';
    const faculty = await User.findById(facultyId);
    if (!faculty || (faculty.role !== 'FACULTY' && faculty.role !== 'ADMIN')) {
      throw ApiError.notFound('Faculty member not found.');
    }

    if (!faculty.facultyProfile) {
      faculty.facultyProfile = {};
    }

    const previousSpec = faculty.facultyProfile.specialization || '';
    faculty.facultyProfile.specialization = specialization.trim();
    await faculty.save();

    await AuditLog.create({
      userId: actorId,
      action: 'FACULTY_SPECIALIZATION_UPDATED',
      entityType: 'USER',
      entityId: facultyId,
      details: { previousSpecialization: previousSpec, newSpecialization: faculty.facultyProfile.specialization },
    });

    logger.info(`[FacultyService] Specialization for faculty ${facultyId} updated by admin ${actorId}`);
    return {
      id: faculty.id,
      name: `${faculty.firstName} ${faculty.lastName}`,
      specialization: faculty.facultyProfile.specialization,
    };
  }
}

export const facultyService = new FacultyService();
