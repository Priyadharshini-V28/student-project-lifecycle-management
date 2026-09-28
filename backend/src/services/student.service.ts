import { query } from '../db';
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
    const studentRes = await query(
      `SELECT 
        u.id, u.first_name AS "firstName", u.last_name AS "lastName", u.email,
        s.roll_number AS "rollNumber", s.semester, s.cgpa,
        b.name AS "batchName",
        d.code AS "departmentCode", d.name AS "departmentName"
      FROM users u
      JOIN students s ON u.id = s.user_id
      LEFT JOIN academic_batches b ON s.batch_id = b.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1 AND u.role = 'STUDENT'`,
      [userId]
    );

    if (studentRes.rows.length === 0) {
      throw ApiError.notFound('Student record not found or user is not an active student');
    }

    const studentRow = studentRes.rows[0];

    // 2. Locate active project enrollment (prioritizes active/allocated capstone projects)
    const projectRes = await query(
      `SELECT 
        p.id, p.title, p.abstract, p.domain, p.status, p.overall_progress AS "overallProgress",
        p.repository_url AS "repositoryUrl", p.created_at AS "createdAt",
        pm.role_in_project AS "roleInProject",
        u_guide.id AS "guideId",
        CONCAT(u_guide.first_name, ' ', u_guide.last_name) AS "guideName",
        u_guide.email AS "guideEmail",
        f.designation AS "guideDesignation",
        d_guide.code AS "guideDepartmentCode"
      FROM project_members pm
      JOIN projects p ON pm.project_id = p.id
      JOIN users u_guide ON p.faculty_guide_id = u_guide.id
      LEFT JOIN faculty f ON u_guide.id = f.user_id
      LEFT JOIN departments d_guide ON u_guide.department_id = d_guide.id
      WHERE pm.student_id = $1
      ORDER BY 
        CASE 
          WHEN p.status IN ('IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED') THEN 1
          WHEN p.status = 'ALLOCATED' THEN 2
          WHEN p.status = 'EVALUATED' THEN 3
          WHEN p.status = 'COMPLETED' THEN 4
          ELSE 5
        END,
        p.created_at DESC
      LIMIT 1`,
      [userId]
    );

    let activeProject = null;
    let milestones: StudentDashboardDto['milestones'] = [];
    let latestReview: StudentDashboardDto['latestReview'] = null;

    if (projectRes.rows.length > 0) {
      const pRow = projectRes.rows[0];
      const projectId = pRow.id;

      // 2a. Fetch team members for the active project
      const teamRes = await query(
        `SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) AS name,
          u.email,
          s.roll_number AS "rollNumber",
          pm.role_in_project AS role
        FROM project_members pm
        JOIN users u ON pm.student_id = u.id
        LEFT JOIN students s ON u.id = s.user_id
        WHERE pm.project_id = $1
        ORDER BY pm.role_in_project DESC, u.first_name ASC`,
        [projectId]
      );

      activeProject = {
        id: pRow.id,
        title: pRow.title,
        abstract: pRow.abstract,
        domain: pRow.domain,
        status: pRow.status,
        overallProgress: parseInt(pRow.overallProgress || '0', 10),
        repositoryUrl: pRow.repositoryUrl,
        roleInProject: pRow.roleInProject as 'LEAD' | 'MEMBER',
        createdAt: toIsoString(pRow.createdAt),
        facultyGuide: {
          id: pRow.guideId,
          name: pRow.guideName,
          email: pRow.guideEmail,
          designation: pRow.guideDesignation || 'Faculty Supervisor',
          departmentCode: pRow.guideDepartmentCode || 'AIDS',
        },
        teamMembers: teamRes.rows.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          rollNumber: row.rollNumber || '',
          role: row.role as 'LEAD' | 'MEMBER',
        })),
      };

      // 2b. Fetch milestones ordered chronologically
      const milestonesRes = await query(
        `SELECT 
          m.id, m.milestone_number AS "milestoneNumber", m.title, m.description,
          m.start_date AS "startDate", m.due_date AS "dueDate",
          m.completion_percentage AS "completionPercentage", m.status,
          m.student_remarks AS "studentRemarks", m.faculty_remarks AS "facultyRemarks",
          m.completed_at AS "completedAt",
          (m.status != 'COMPLETED' AND m.due_date < CURRENT_DATE) AS "isOverdue"
        FROM milestones m
        WHERE m.project_id = $1
        ORDER BY m.milestone_number ASC`,
        [projectId]
      );

      milestones = milestonesRes.rows.map((m) => ({
        id: m.id,
        milestoneNumber: m.milestoneNumber,
        title: m.title,
        description: m.description,
        startDate: toIsoString(m.startDate),
        dueDate: toIsoString(m.dueDate),
        completionPercentage: parseInt(m.completionPercentage || '0', 10),
        status: m.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE',
        isOverdue: Boolean(m.isOverdue),
        studentRemarks: m.studentRemarks,
        facultyRemarks: m.facultyRemarks,
        completedAt: m.completedAt ? toIsoString(m.completedAt) : null,
      }));

      // 2c. Fetch latest faculty review and check if an outstanding resubmission is needed
      const reviewRes = await query(
        `SELECT 
          r.id, r.round_number AS "roundNumber", r.review_title AS "reviewTitle",
          r.review_date AS "reviewDate", r.status, r.general_feedback AS "generalFeedback",
          r.strengths, r.issues_identified AS "issuesIdentified", r.required_changes AS "requiredChanges",
          r.has_marks AS "hasMarks", r.technical_score AS "technicalScore",
          r.documentation_score AS "documentationScore", r.presentation_score AS "presentationScore",
          r.total_score AS "totalScore",
          CONCAT(u.first_name, ' ', u.last_name) AS "reviewerName"
        FROM reviews r
        JOIN users u ON r.faculty_id = u.id
        WHERE r.project_id = $1
        ORDER BY r.round_number DESC, r.created_at DESC
        LIMIT 1`,
        [projectId]
      );

      if (reviewRes.rows.length > 0) {
        const rRow = reviewRes.rows[0];

        // Check if there is already a resubmission for this review
        let hasPendingResubmission = false;
        if (rRow.status === 'CHANGES_REQUESTED') {
          const resubRes = await query(
            'SELECT id FROM review_resubmissions WHERE review_id = $1 LIMIT 1',
            [rRow.id]
          );
          hasPendingResubmission = resubRes.rows.length === 0;
        }

        latestReview = {
          id: rRow.id,
          roundNumber: rRow.roundNumber,
          reviewTitle: rRow.reviewTitle,
          reviewDate: toIsoString(rRow.reviewDate),
          status: rRow.status,
          generalFeedback: rRow.generalFeedback,
          strengths: rRow.strengths,
          issuesIdentified: rRow.issuesIdentified,
          requiredChanges: rRow.requiredChanges,
          hasMarks: Boolean(rRow.hasMarks),
          technicalScore: rRow.technicalScore ? parseFloat(rRow.technicalScore) : null,
          documentationScore: rRow.documentationScore ? parseFloat(rRow.documentationScore) : null,
          presentationScore: rRow.presentationScore ? parseFloat(rRow.presentationScore) : null,
          totalScore: rRow.totalScore ? parseFloat(rRow.totalScore) : null,
          reviewerName: rRow.reviewerName,
          hasPendingResubmission,
        };
      }
    }

    // 3. Fetch proposals submitted by the student
    const proposalsRes = await query(
      `SELECT 
        id, title, domain, status, version, academic_year AS "academicYear", created_at AS "createdAt"
      FROM proposals
      WHERE submitted_by = $1
      ORDER BY created_at DESC`,
      [userId]
    );

    const proposals = proposalsRes.rows.map((p) => ({
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
        id: studentRow.id,
        firstName: studentRow.firstName,
        lastName: studentRow.lastName,
        email: studentRow.email,
        rollNumber: studentRow.rollNumber,
        semester: studentRow.semester,
        cgpa: studentRow.cgpa ? parseFloat(studentRow.cgpa) : 0.0,
        batchName: studentRow.batchName || '2022-2026',
        departmentCode: studentRow.departmentCode || 'AIDS',
        departmentName: studentRow.departmentName || 'Artificial Intelligence & Data Science',
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
        proposalsCount: proposals.length,
      },
      activeProject,
      milestones,
      latestReview,
      proposals,
    };
  }
}

export const studentService = new StudentService();
