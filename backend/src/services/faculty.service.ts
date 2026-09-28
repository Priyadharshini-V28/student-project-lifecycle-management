import { query } from '../db';
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
    const facultyRes = await query(
      `SELECT 
        u.id, u.first_name AS "firstName", u.last_name AS "lastName", u.email,
        f.employee_id AS "employeeId", f.designation, f.specialization, f.max_projects AS "maxQuota",
        d.code AS "departmentCode", d.name AS "departmentName"
      FROM users u
      JOIN faculty f ON u.id = f.user_id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1 AND u.role IN ('FACULTY', 'ADMIN')`,
      [userId]
    );

    if (facultyRes.rows.length === 0) {
      throw ApiError.notFound('Faculty record not found or user is not a faculty member');
    }

    const facRow = facultyRes.rows[0];
    const maxQuota = parseInt(facRow.maxQuota || '5', 10);

    // 2. Fetch all projects assigned to this faculty guide
    const projectsRes = await query(
      `SELECT 
        p.id, p.title, p.abstract, p.domain, p.status, p.overall_progress AS "overallProgress",
        p.repository_url AS "repositoryUrl", p.created_at AS "createdAt",
        u_lead.id AS "leadId",
        CONCAT(u_lead.first_name, ' ', u_lead.last_name) AS "leadName",
        u_lead.email AS "leadEmail",
        s_lead.roll_number AS "leadRollNumber"
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id AND pm.role_in_project = 'LEAD'
      JOIN users u_lead ON pm.student_id = u_lead.id
      LEFT JOIN students s_lead ON u_lead.id = s_lead.user_id
      WHERE p.faculty_guide_id = $1
      ORDER BY 
        CASE 
          WHEN p.status = 'UNDER_REVIEW' THEN 1
          WHEN p.status = 'CHANGES_REQUESTED' THEN 2
          WHEN p.status = 'IN_PROGRESS' THEN 3
          WHEN p.status = 'ALLOCATED' THEN 4
          WHEN p.status = 'EVALUATED' THEN 5
          ELSE 6
        END,
        p.created_at DESC`,
      [userId]
    );

    // 3. Enrich projects with team size, current milestone, and latest review
    const assignedProjects: FacultyDashboardDto['assignedProjects'] = [];
    const pendingReviewsQueue: FacultyDashboardDto['actionQueues']['pendingReviews'] = [];

    for (const p of projectsRes.rows) {
      // 3a. Member count
      const memberCountRes = await query(
        'SELECT COUNT(id) AS count FROM project_members WHERE project_id = $1',
        [p.id]
      );
      const teamMembersCount = parseInt(memberCountRes.rows[0]?.count || '1', 10);

      // 3b. Current active or next milestone
      const milestoneRes = await query(
        `SELECT 
          milestone_number AS "milestoneNumber", title, due_date AS "dueDate",
          status, completion_percentage AS "completionPercentage",
          (status != 'COMPLETED' AND due_date < CURRENT_DATE) AS "isOverdue"
        FROM milestones
        WHERE project_id = $1
        ORDER BY 
          CASE 
            WHEN status = 'IN_PROGRESS' THEN 1
            WHEN status = 'PENDING' THEN 2
            WHEN status = 'OVERDUE' THEN 3
            ELSE 4
          END,
          milestone_number ASC
        LIMIT 1`,
        [p.id]
      );

      let currentMilestone = null;
      if (milestoneRes.rows.length > 0) {
        const mRow = milestoneRes.rows[0];
        currentMilestone = {
          milestoneNumber: mRow.milestoneNumber,
          title: mRow.title,
          dueDate: toIsoString(mRow.dueDate),
          status: mRow.status,
          completionPercentage: parseInt(mRow.completionPercentage || '0', 10),
          isOverdue: Boolean(mRow.isOverdue),
        };
      }

      // 3c. Latest review conducted
      const reviewRes = await query(
        `SELECT 
          round_number AS "roundNumber", review_date AS "reviewDate",
          status, total_score AS "totalScore"
        FROM reviews
        WHERE project_id = $1
        ORDER BY round_number DESC, created_at DESC
        LIMIT 1`,
        [p.id]
      );

      let latestReview = null;
      if (reviewRes.rows.length > 0) {
        const rRow = reviewRes.rows[0];
        latestReview = {
          roundNumber: rRow.roundNumber,
          reviewDate: toIsoString(rRow.reviewDate),
          status: rRow.status,
          totalScore: rRow.totalScore ? parseFloat(rRow.totalScore) : null,
        };
      }

      // 3d. Add to pending reviews queue if project status is UNDER_REVIEW
      if (p.status === 'UNDER_REVIEW') {
        pendingReviewsQueue.push({
          projectId: p.id,
          projectTitle: p.title,
          domain: p.domain,
          status: p.status,
          studentLead: p.leadName,
          rollNumber: p.leadRollNumber || 'N/A',
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
        overallProgress: parseInt(p.overallProgress || '0', 10),
        repositoryUrl: p.repositoryUrl,
        createdAt: toIsoString(p.createdAt),
        studentLead: {
          id: p.leadId,
          name: p.leadName,
          email: p.leadEmail,
          rollNumber: p.leadRollNumber || 'N/A',
        },
        teamMembersCount,
        currentMilestone,
        latestReview,
      });
    }

    // 4. Action Queue 2: Pending Student Resubmissions awaiting faculty re-evaluation
    const resubmissionsRes = await query(
      `SELECT 
        rs.id AS "resubmissionId", rs.review_id AS "reviewId", rs.project_id AS "projectId",
        p.title AS "projectTitle",
        CONCAT(u_lead.first_name, ' ', u_lead.last_name) AS "studentLead",
        s_lead.roll_number AS "leadRollNumber",
        r.round_number AS "roundNumber",
        r.required_changes AS "originalRequiredChanges",
        rs.student_notes AS "studentNotes",
        rs.resubmitted_at AS "resubmittedAt"
      FROM review_resubmissions rs
      JOIN reviews r ON rs.review_id = r.id
      JOIN projects p ON rs.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id AND pm.role_in_project = 'LEAD'
      JOIN users u_lead ON pm.student_id = u_lead.id
      LEFT JOIN students s_lead ON u_lead.id = s_lead.user_id
      LEFT JOIN reviews r_next ON r_next.project_id = rs.project_id AND r_next.round_number > r.round_number
      WHERE p.faculty_guide_id = $1
        AND r_next.id IS NULL
      ORDER BY rs.resubmitted_at DESC`,
      [userId]
    );

    const pendingResubmissions = resubmissionsRes.rows.map((row) => ({
      resubmissionId: row.resubmissionId,
      reviewId: row.reviewId,
      projectId: row.projectId,
      projectTitle: row.projectTitle,
      studentLead: row.studentLead,
      rollNumber: row.leadRollNumber || 'N/A',
      roundNumber: row.roundNumber,
      studentNotes: row.studentNotes,
      resubmittedAt: toIsoString(row.resubmittedAt),
      originalRequiredChanges: row.originalRequiredChanges,
    }));

    // 5. Action Queue 3: Student Proposals assigned to this faculty awaiting appraisal
    const proposalsRes = await query(
      `SELECT 
        p.id AS "proposalId", p.title, p.domain, p.status, p.version,
        p.academic_year AS "academicYear", p.created_at AS "createdAt",
        CONCAT(u.first_name, ' ', u.last_name) AS "submittedByName",
        s.roll_number AS "submittedByRoll"
      FROM proposals p
      JOIN users u ON p.submitted_by = u.id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE p.assigned_faculty_id = $1 AND p.status IN ('SUBMITTED', 'UNDER_REVIEW')
      ORDER BY p.created_at DESC`,
      [userId]
    );

    const pendingProposals = proposalsRes.rows.map((row) => ({
      proposalId: row.proposalId,
      title: row.title,
      domain: row.domain,
      submittedByName: row.submittedByName,
      submittedByRoll: row.submittedByRoll || 'N/A',
      status: row.status,
      version: row.version,
      academicYear: row.academicYear,
      createdAt: toIsoString(row.createdAt),
    }));

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
        id: facRow.id,
        firstName: facRow.firstName,
        lastName: facRow.lastName,
        email: facRow.email,
        employeeId: facRow.employeeId,
        designation: facRow.designation,
        specialization: facRow.specialization,
        departmentCode: facRow.departmentCode || 'AIDS',
        departmentName: facRow.departmentName || 'Department of Artificial Intelligence & Data Science',
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
}

export const facultyService = new FacultyService();
