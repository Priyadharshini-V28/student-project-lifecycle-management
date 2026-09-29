import { User, Project, Review, Proposal, Department, AcademicBatch } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface StudentDashboardDto {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rollNumber: string;
    semester: number;
    cgpa: number;
    batchName: string;
    departmentCode: string;
    departmentName: string;
  };
  metrics: {
    hasActiveProject: boolean;
    projectStatus: string | null;
    overallProgress: number;
    milestonesCompleted: number;
    milestonesTotal: number;
    milestoneProgressPercentage: number;
    overdueMilestonesCount: number;
    pendingReviewAction: boolean;
    proposalsCount: number;
  };
  activeProject: {
    id: string;
    title: string;
    abstract: string;
    domain: string;
    status: string;
    overallProgress: number;
    repositoryUrl: string | null;
    roleInProject: 'LEAD' | 'MEMBER';
    createdAt: string;
    facultyGuide: {
      id: string;
      name: string;
      email: string;
      designation: string;
      departmentCode: string;
    };
    teamMembers: Array<{
      id: string;
      name: string;
      email: string;
      rollNumber: string;
      role: 'LEAD' | 'MEMBER';
    }>;
  } | null;
  milestones: Array<{
    id: string;
    milestoneNumber: number;
    title: string;
    description: string;
    startDate: string;
    dueDate: string;
    completionPercentage: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
    isOverdue: boolean;
    studentRemarks: string | null;
    facultyRemarks: string | null;
    completedAt: string | null;
  }>;
  latestReview: {
    id: string;
    roundNumber: number;
    reviewTitle: string;
    reviewDate: string;
    status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
    generalFeedback: string;
    strengths: string | null;
    issuesIdentified: string | null;
    requiredChanges: string | null;
    hasMarks: boolean;
    technicalScore: number | null;
    documentationScore: number | null;
    presentationScore: number | null;
    totalScore: number | null;
    reviewerName: string;
    hasPendingResubmission: boolean;
  } | null;
  proposals: Array<{
    id: string;
    title: string;
    domain: string;
    status: string;
    version: number;
    academicYear: string;
    createdAt: string;
  }>;
}

const toIsoString = (val: unknown): string => {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
};

export class StudentService {
  /**
   * Aggregates real-time academic project metrics and lifecycle state for the student
   */
  async getStudentDashboard(userId: string): Promise<StudentDashboardDto> {
    // 1. Fetch student demographic and institutional details
    const student = await User.findOne({ _id: userId, role: 'STUDENT' });

    if (!student) {
      throw ApiError.notFound('Student record not found or user is not an active student');
    }

    const dept = student.departmentId ? await Department.findById(student.departmentId) : null;
    const batch = student.studentProfile?.batchId ? await AcademicBatch.findById(student.studentProfile.batchId) : null;

    // 2. Locate active project enrollment
    const projects = await Project.find({ 'teamMembers.studentId': userId });

    const statusWeight: Record<string, number> = {
      IN_PROGRESS: 1,
      UNDER_REVIEW: 1,
      CHANGES_REQUESTED: 1,
      ALLOCATED: 2,
      EVALUATED: 3,
      COMPLETED: 4,
    };

    projects.sort((a, b) => {
      const weightA = statusWeight[a.status] || 5;
      const weightB = statusWeight[b.status] || 5;
      if (weightA !== weightB) return weightA - weightB;
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });

    const activeProjectDoc = projects.length > 0 ? projects[0] : null;

    let activeProject = null;
    let milestones: StudentDashboardDto['milestones'] = [];
    let latestReview: StudentDashboardDto['latestReview'] = null;

    if (activeProjectDoc) {
      // 2a. Fetch supervisor & team members
      const guide = await User.findById(activeProjectDoc.facultyGuideId);
      const guideDept = guide?.departmentId ? await Department.findById(guide.departmentId) : null;

      const teamMembers = await Promise.all(
        activeProjectDoc.teamMembers.map(async (m) => {
          const u = await User.findById(m.studentId);
          return {
            id: m.studentId,
            name: u ? `${u.firstName} ${u.lastName}` : 'Student',
            email: u ? u.email : '',
            rollNumber: u?.studentProfile?.rollNumber || '',
            role: m.roleInProject as 'LEAD' | 'MEMBER',
          };
        })
      );

      // Sort team members: LEAD first, then by name
      teamMembers.sort((a, b) => {
        if (a.role === 'LEAD' && b.role !== 'LEAD') return -1;
        if (a.role !== 'LEAD' && b.role === 'LEAD') return 1;
        return a.name.localeCompare(b.name);
      });

      const memberRole = activeProjectDoc.teamMembers.find((m) => m.studentId === userId)?.roleInProject || 'MEMBER';

      activeProject = {
        id: activeProjectDoc.id,
        title: activeProjectDoc.title,
        abstract: activeProjectDoc.abstract,
        domain: activeProjectDoc.domain,
        status: activeProjectDoc.status,
        overallProgress: activeProjectDoc.overallProgress || 0,
        repositoryUrl: activeProjectDoc.repositoryUrl || null,
        roleInProject: memberRole as 'LEAD' | 'MEMBER',
        createdAt: toIsoString(activeProjectDoc.createdAt),
        facultyGuide: {
          id: guide?.id || '',
          name: guide ? `${guide.firstName} ${guide.lastName}` : 'Unassigned',
          email: guide?.email || '',
          designation: guide?.facultyProfile?.designation || 'Faculty Supervisor',
          departmentCode: guideDept?.code || 'AIDS',
        },
        teamMembers,
      };

      // 2b. Milestones ordered chronologically
      const today = new Date();
      milestones = (activeProjectDoc.milestones || [])
        .sort((a, b) => a.milestoneNumber - b.milestoneNumber)
        .map((m) => {
          const isOverdue = m.status !== 'COMPLETED' && new Date(m.dueDate) < today;
          return {
            id: m._id ? String(m._id) : String(m.milestoneNumber),
            milestoneNumber: m.milestoneNumber,
            title: m.title,
            description: m.description,
            startDate: toIsoString(m.startDate),
            dueDate: toIsoString(m.dueDate),
            completionPercentage: m.completionPercentage || 0,
            status: m.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE',
            isOverdue,
            studentRemarks: m.studentRemarks || null,
            facultyRemarks: m.facultyRemarks || null,
            completedAt: m.completedAt ? toIsoString(m.completedAt) : null,
          };
        });

      // 2c. Fetch latest faculty review
      const reviews = await Review.find({ projectId: activeProjectDoc.id })
        .sort({ roundNumber: -1, createdAt: -1 })
        .limit(1);

      if (reviews.length > 0) {
        const rDoc = reviews[0];
        const reviewer = await User.findById(rDoc.facultyId);

        let hasPendingResubmission = false;
        if (rDoc.status === 'CHANGES_REQUESTED') {
          hasPendingResubmission = (rDoc.resubmissions || []).length === 0;
        }

        latestReview = {
          id: rDoc.id,
          roundNumber: rDoc.roundNumber,
          reviewTitle: rDoc.reviewTitle,
          reviewDate: toIsoString(rDoc.reviewDate),
          status: rDoc.status as 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED',
          generalFeedback: rDoc.generalFeedback,
          strengths: rDoc.strengths || null,
          issuesIdentified: rDoc.issuesIdentified || null,
          requiredChanges: rDoc.requiredChanges || null,
          hasMarks: Boolean(rDoc.hasMarks),
          technicalScore: rDoc.technicalScore !== undefined ? Number(rDoc.technicalScore) : null,
          documentationScore: rDoc.documentationScore !== undefined ? Number(rDoc.documentationScore) : null,
          presentationScore: rDoc.presentationScore !== undefined ? Number(rDoc.presentationScore) : null,
          totalScore: rDoc.totalScore !== undefined ? Number(rDoc.totalScore) : null,
          reviewerName: reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'Faculty Reviewer',
          hasPendingResubmission,
        };
      }
    }

    // 3. Fetch proposals submitted by the student
    const proposals = await Proposal.find({ submittedBy: userId }).sort({ createdAt: -1 });

    const formattedProposals = proposals.map((p) => ({
      id: p.id,
      title: p.title,
      domain: p.domain,
      status: p.status,
      version: p.version,
      academicYear: p.academicYear,
      createdAt: toIsoString(p.createdAt),
    }));

    // 4. Compute derived metric counters
    const milestonesCompleted = milestones.filter((m) => m.status === 'COMPLETED').length;
    const milestonesTotal = milestones.length;
    const milestoneProgressPercentage =
      milestonesTotal > 0 ? Math.round((milestonesCompleted / milestonesTotal) * 100) : 0;
    const overdueMilestonesCount = milestones.filter((m) => m.isOverdue).length;

    const pendingReviewAction =
      Boolean(latestReview && latestReview.status === 'CHANGES_REQUESTED' && latestReview.hasPendingResubmission) ||
      (activeProject ? activeProject.status === 'CHANGES_REQUESTED' : false);

    logger.debug(`[StudentDashboard] Aggregated metrics calculated for student ID: ${userId}`);

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        rollNumber: student.studentProfile?.rollNumber || '',
        semester: student.studentProfile?.semester || 1,
        cgpa: student.studentProfile?.cgpa ? Number(student.studentProfile.cgpa) : 0.0,
        batchName: batch?.name || '2022-2026 Batch',
        departmentCode: dept?.code || 'AIDS',
        departmentName: dept?.name || 'Department of Artificial Intelligence & Data Science',
      },
      metrics: {
        hasActiveProject: Boolean(activeProject),
        projectStatus: activeProject ? activeProject.status : null,
        overallProgress: activeProject ? activeProject.overallProgress : 0,
        milestonesCompleted,
        milestonesTotal,
        milestoneProgressPercentage,
        overdueMilestonesCount,
        pendingReviewAction,
        proposalsCount: formattedProposals.length,
      },
      activeProject,
      milestones,
      latestReview,
      proposals: formattedProposals,
    };
  }
}

export const studentService = new StudentService();
