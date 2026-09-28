import { query, transaction } from '../db';
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
  id: number;
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
    const res = await query(
      `SELECT key, value FROM system_settings WHERE key IN ('MAX_TEAM_SIZE', 'MIN_TEAM_SIZE', 'ALLOW_STUDENT_PROPOSALS')`
    );

    const map: Record<string, string> = {};
    for (const row of res.rows) {
      map[row.key] = row.value;
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
    const studentRes = await query(
      `SELECT u.id, u.first_name, u.last_name, u.role, s.roll_number 
       FROM users u 
       JOIN students s ON u.id = s.user_id 
       WHERE u.id = $1`,
      [studentUserId]
    );

    if (studentRes.rows.length === 0) {
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
      const facRes = await query(
        `SELECT user_id FROM faculty WHERE user_id = $1`,
        [input.assignedFacultyId]
      );
      if (facRes.rows.length === 0) {
        throw ApiError.badRequest('Selected faculty guide was not found in the faculty directory.');
      }
    }

    // 5. Verify prospective co-members are enrolled students
    if (coMemberIds.length > 0) {
      for (const mId of coMemberIds) {
        const memRes = await query(`SELECT user_id FROM students WHERE user_id = $1`, [mId]);
        if (memRes.rows.length === 0) {
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
    const createdProposal = await transaction(async (client) => {
      const propInsert = await client.query(
        `INSERT INTO proposals (
          title, abstract, domain, tech_stack, submitted_by, assigned_faculty_id, status, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
        RETURNING id`,
        [
          input.title,
          input.abstract,
          input.domain,
          input.techStack,
          studentUserId,
          input.assignedFacultyId || null,
          finalInitialStatus,
        ]
      );

      const proposalId = propInsert.rows[0].id;

      // Creator is automatically accepted member
      await client.query(
        `INSERT INTO proposal_members (proposal_id, student_id, status) VALUES ($1, $2, 'ACCEPTED')`,
        [proposalId, studentUserId]
      );

      // Invited co-members
      for (const mId of coMemberIds) {
        await client.query(
          `INSERT INTO proposal_members (proposal_id, student_id, status) VALUES ($1, $2, 'INVITED')`,
          [proposalId, mId]
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          studentUserId,
          'PROPOSAL_CREATED',
          'PROPOSAL',
          proposalId,
          JSON.stringify({ title: input.title, initialStatus: finalInitialStatus }),
        ]
      );

      return proposalId;
    });

    logger.info(`[ProposalService] Proposal ${createdProposal} created by student ${studentUserId}`);
    return this.getProposalById(createdProposal);
  }

  /**
   * List proposals visible to the user based on role
   */
  async getProposalsForUser(userId: string, role: string): Promise<ProposalDetail[]> {
    let proposalIds: string[] = [];

    if (role === 'STUDENT') {
      const res = await query(
        `SELECT DISTINCT p.id 
         FROM proposals p
         LEFT JOIN proposal_members pm ON p.id = pm.proposal_id
         WHERE p.submitted_by = $1 OR pm.student_id = $1
         ORDER BY p.id`,
        [userId]
      );
      proposalIds = res.rows.map((r) => r.id);
    } else if (role === 'FACULTY') {
      const res = await query(
        `SELECT DISTINCT p.id 
         FROM proposals p
         JOIN users u ON u.id = $1
         LEFT JOIN users submitter ON p.submitted_by = submitter.id
         WHERE p.assigned_faculty_id = $1 
            OR (p.assigned_faculty_id IS NULL AND submitter.department_id = u.department_id AND p.status != 'DRAFT')
         ORDER BY p.id`,
        [userId]
      );
      proposalIds = res.rows.map((r) => r.id);
    } else {
      // ADMIN sees all proposals
      const res = await query(`SELECT id FROM proposals ORDER BY created_at DESC`);
      proposalIds = res.rows.map((r) => r.id);
    }

    const proposals: ProposalDetail[] = [];
    for (const id of proposalIds) {
      const p = await this.getProposalById(id);
      proposals.push(p);
    }
    return proposals;
  }

  /**
   * Retrieve complete proposal details including members, submitter, and supervisor info
   */
  async getProposalById(proposalId: string): Promise<ProposalDetail> {
    const propRes = await query(
      `SELECT 
        p.id, p.title, p.abstract, p.domain, p.tech_stack AS "techStack",
        p.submitted_by AS "submittedById",
        sub.first_name AS "subFirstName", sub.last_name AS "subLastName", sub.email AS "subEmail",
        s.roll_number AS "subRollNumber", d.code AS "subDeptCode",
        p.assigned_faculty_id AS "assignedFacultyId",
        fac_u.first_name AS "facFirstName", fac_u.last_name AS "facLastName", fac_u.email AS "facEmail",
        fac.designation AS "facDesignation", fac_d.code AS "facDeptCode",
        p.status, p.faculty_comments AS "facultyComments", p.version,
        p.academic_year AS "academicYear", p.created_at AS "createdAt", p.updated_at AS "updatedAt",
        proj.id AS "projectId"
      FROM proposals p
      JOIN users sub ON p.submitted_by = sub.id
      JOIN students s ON sub.id = s.user_id
      LEFT JOIN departments d ON sub.department_id = d.id
      LEFT JOIN users fac_u ON p.assigned_faculty_id = fac_u.id
      LEFT JOIN faculty fac ON fac_u.id = fac.user_id
      LEFT JOIN departments fac_d ON fac_u.department_id = fac_d.id
      LEFT JOIN projects proj ON p.id = proj.proposal_id
      WHERE p.id = $1`,
      [proposalId]
    );

    if (propRes.rows.length === 0) {
      throw ApiError.notFound(`Proposal with ID ${proposalId} not found.`);
    }

    const row = propRes.rows[0];

    // Fetch team members
    const memRes = await query(
      `SELECT 
        pm.id, pm.student_id AS "studentId", pm.status, pm.joined_at AS "joinedAt",
        u.first_name AS "firstName", u.last_name AS "lastName", u.email,
        s.roll_number AS "rollNumber", s.semester
      FROM proposal_members pm
      JOIN users u ON pm.student_id = u.id
      JOIN students s ON u.id = s.user_id
      WHERE pm.proposal_id = $1
      ORDER BY pm.joined_at ASC`,
      [proposalId]
    );

    const members: ProposalMemberItem[] = memRes.rows.map((m) => ({
      id: m.id,
      studentId: m.studentId,
      name: `${m.firstName} ${m.lastName}`,
      email: m.email,
      rollNumber: m.rollNumber,
      semester: m.semester,
      status: m.status,
      isLead: m.studentId === row.submittedById,
      joinedAt: toIsoString(m.joinedAt),
    }));

    return {
      id: row.id,
      title: row.title,
      abstract: row.abstract,
      domain: row.domain,
      techStack: Array.isArray(row.techStack) ? row.techStack : [],
      submittedBy: {
        id: row.submittedById,
        name: `${row.subFirstName} ${row.subLastName}`,
        email: row.subEmail,
        rollNumber: row.subRollNumber,
        departmentCode: row.subDeptCode || 'AIDS',
      },
      assignedFaculty: row.assignedFacultyId
        ? {
            id: row.assignedFacultyId,
            name: `${row.facFirstName} ${row.facLastName}`,
            email: row.facEmail,
            designation: row.facDesignation || 'Faculty Advisor',
            departmentCode: row.facDeptCode || 'AIDS',
          }
        : null,
      status: row.status,
      facultyComments: row.facultyComments,
      version: row.version,
      academicYear: row.academicYear,
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      members,
      projectId: row.projectId || null,
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
    const existing = await query(
      `SELECT submitted_by, status, version FROM proposals WHERE id = $1`,
      [proposalId]
    );

    if (existing.rows.length === 0) {
      throw ApiError.notFound('Proposal not found');
    }

    const row = existing.rows[0];
    if (row.submitted_by !== studentUserId) {
      throw ApiError.forbidden('Only the student team lead who authored this proposal can modify it.');
    }

    if (row.status !== 'DRAFT' && row.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest(
        `Cannot edit proposal in "${row.status}" status. Modifications are only permitted during DRAFT or CHANGES_REQUESTED stages.`
      );
    }

    // Build update parameters
    const updates: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const params: unknown[] = [proposalId];

    if (input.title !== undefined) {
      params.push(input.title);
      updates.push(`title = $${params.length}`);
    }
    if (input.abstract !== undefined) {
      params.push(input.abstract);
      updates.push(`abstract = $${params.length}`);
    }
    if (input.domain !== undefined) {
      params.push(input.domain);
      updates.push(`domain = $${params.length}`);
    }
    if (input.techStack !== undefined) {
      params.push(input.techStack);
      updates.push(`tech_stack = $${params.length}`);
    }
    if (input.assignedFacultyId !== undefined) {
      params.push(input.assignedFacultyId);
      updates.push(`assigned_faculty_id = $${params.length}`);
    }

    await query(
      `UPDATE proposals SET ${updates.join(', ')} WHERE id = $1`,
      params
    );

    logger.info(`[ProposalService] Proposal ${proposalId} updated by student ${studentUserId}`);
    return this.getProposalById(proposalId);
  }

  /**
   * Submit / Resubmit proposal for faculty review
   */
  async submitProposal(proposalId: string, studentUserId: string): Promise<ProposalDetail> {
    const existing = await query(
      `SELECT submitted_by, status, assigned_faculty_id, version FROM proposals WHERE id = $1`,
      [proposalId]
    );

    if (existing.rows.length === 0) {
      throw ApiError.notFound('Proposal not found');
    }

    const row = existing.rows[0];
    if (row.submitted_by !== studentUserId) {
      throw ApiError.forbidden('Only the student team lead can submit this proposal.');
    }

    if (row.status !== 'DRAFT' && row.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest(`Proposal cannot be submitted from current status "${row.status}".`);
    }

    // Verify team members satisfy minimum threshold
    const settings = await this.getSystemSettings();
    const acceptedMemRes = await query(
      `SELECT COUNT(id) AS count FROM proposal_members WHERE proposal_id = $1 AND status = 'ACCEPTED'`,
      [proposalId]
    );
    const acceptedCount = parseInt(acceptedMemRes.rows[0]?.count || '1', 10);
    if (acceptedCount < settings.minTeamSize) {
      throw ApiError.badRequest(
        `Proposal requires at least ${settings.minTeamSize} confirmed team member(s). Currently confirmed: ${acceptedCount}.`
      );
    }

    // If resubmitting from CHANGES_REQUESTED, bump version
    const newVersion = row.status === 'CHANGES_REQUESTED' ? row.version + 1 : row.version;
    const nextStatus = row.assigned_faculty_id ? 'UNDER_REVIEW' : 'SUBMITTED';

    await query(
      `UPDATE proposals 
       SET status = $1, version = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [nextStatus, newVersion, proposalId]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        studentUserId,
        row.status === 'CHANGES_REQUESTED' ? 'PROPOSAL_RESUBMITTED' : 'PROPOSAL_SUBMITTED',
        'PROPOSAL',
        proposalId,
        JSON.stringify({ newVersion, nextStatus }),
      ]
    );

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

    // Determine the faculty guide ID
    const guideId = prop.assignedFaculty?.id || evaluatorUserId;

    if (input.status === 'APPROVED') {
      // 1. Check Faculty Supervising Capacity Quota
      const facRes = await query(
        `SELECT max_projects FROM faculty WHERE user_id = $1`,
        [guideId]
      );
      const maxQuota = facRes.rows[0]?.max_projects ?? 5;

      const assignedRes = await query(
        `SELECT COUNT(id) AS count 
         FROM projects 
         WHERE faculty_guide_id = $1 AND status NOT IN ('COMPLETED', 'ARCHIVED')`,
        [guideId]
      );
      const currentlyAssigned = parseInt(assignedRes.rows[0]?.count || '0', 10);

      if (currentlyAssigned >= maxQuota) {
        throw ApiError.badRequest(
          `Faculty guide has reached the maximum supervising quota (${currentlyAssigned}/${maxQuota}). Please reassign or increase capacity before approval.`
        );
      }

      // 2. Atomic Auto-Instantiation Transaction
      const instantiatedProjectId = await transaction(async (client) => {
        // A. Update proposal to APPROVED
        await client.query(
          `UPDATE proposals 
           SET status = 'APPROVED', faculty_comments = $1, assigned_faculty_id = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [input.facultyComments, guideId, proposalId]
        );

        // B. Insert into projects
        const projRes = await client.query(
          `INSERT INTO projects (
            proposal_id, title, abstract, domain, faculty_guide_id, status, overall_progress
          ) VALUES ($1, $2, $3, $4, $5, 'ALLOCATED', 0)
          RETURNING id`,
          [proposalId, prop.title, prop.abstract, prop.domain, guideId]
        );
        const newProjectId = projRes.rows[0].id;

        // C. Populate project_members from accepted proposal_members
        for (const m of prop.members) {
          if (m.status === 'ACCEPTED') {
            const roleInProject = m.studentId === prop.submittedBy.id ? 'LEAD' : 'MEMBER';
            await client.query(
              `INSERT INTO project_members (project_id, student_id, role_in_project)
               VALUES ($1, $2, $3)`,
              [newProjectId, m.studentId, roleInProject]
            );
          }
        }

        // D. Instantiate 5 Standard Milestone Gates
        const now = new Date();
        const addDays = (d: Date, days: number): string => {
          const t = new Date(d);
          t.setDate(t.getDate() + days);
          return t.toISOString().substring(0, 10);
        };

        const standardMilestones = [
          {
            num: 1,
            title: 'Requirement Analysis & Literature Review',
            desc: 'System Requirement Specification (SRS), formal domain feasibility study, and literature survey benchmark.',
            start: addDays(now, 0),
            due: addDays(now, 30),
          },
          {
            num: 2,
            title: 'System Architecture & Detailed Design',
            desc: 'Comprehensive architectural blueprint, database relational modeling, and API contract specifications.',
            start: addDays(now, 30),
            due: addDays(now, 60),
          },
          {
            num: 3,
            title: 'Core Module Implementation & Integration',
            desc: 'Algorithmic development, neural model training or core service pipeline, and full-stack API integration.',
            start: addDays(now, 60),
            due: addDays(now, 105),
          },
          {
            num: 4,
            title: 'Testing, Benchmarking & Performance Optimization',
            desc: 'System integration verification, accuracy benchmarking, latency profiling, and unit/regression test execution.',
            start: addDays(now, 105),
            due: addDays(now, 135),
          },
          {
            num: 5,
            title: 'Final Thesis Documentation & Viva Defense',
            desc: 'Complete capstone documentation, presentation deck preparation, code repository archiving, and final viva voce.',
            start: addDays(now, 135),
            due: addDays(now, 160),
          },
        ];

        for (const m of standardMilestones) {
          await client.query(
            `INSERT INTO milestones (
              project_id, milestone_number, title, description, start_date, due_date, status, completion_percentage
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 0)`,
            [newProjectId, m.num, m.title, m.desc, m.start, m.due]
          );
        }

        // E. Audit log
        await client.query(
          `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            evaluatorUserId,
            'PROPOSAL_APPROVED_AND_PROJECT_ALLOCATED',
            'PROJECT',
            newProjectId,
            JSON.stringify({ proposalId, guideId, membersCount: prop.members.filter((m) => m.status === 'ACCEPTED').length }),
          ]
        );

        return newProjectId;
      });

      logger.info(`[ProposalService] Proposal ${proposalId} APPROVED by ${evaluatorUserId}. Instantiated active project ${instantiatedProjectId}`);
      const updatedProp = await this.getProposalById(proposalId);
      return { proposal: updatedProp, instantiatedProjectId };
    }

    // For CHANGES_REQUESTED or REJECTED
    await query(
      `UPDATE proposals 
       SET status = $1, faculty_comments = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [input.status, input.facultyComments, proposalId]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        evaluatorUserId,
        `PROPOSAL_${input.status}`,
        'PROPOSAL',
        proposalId,
        JSON.stringify({ comments: input.facultyComments }),
      ]
    );

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
    const prop = await this.getProposalById(proposalId);

    if (prop.submittedBy.id !== requesterUserId) {
      throw ApiError.forbidden('Only the student team lead can invite members to this proposal.');
    }

    if (prop.status !== 'DRAFT' && prop.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest('Team members can only be added while proposal is in DRAFT or CHANGES_REQUESTED.');
    }

    // Check student validity
    const studentRes = await query(
      `SELECT user_id FROM students WHERE user_id = $1`,
      [newStudentId]
    );
    if (studentRes.rows.length === 0) {
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

    await query(
      `INSERT INTO proposal_members (proposal_id, student_id, status) VALUES ($1, $2, 'INVITED')`,
      [proposalId, newStudentId]
    );

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
    const memberRes = await query(
      `SELECT id, status FROM proposal_members WHERE proposal_id = $1 AND student_id = $2`,
      [proposalId, studentUserId]
    );

    if (memberRes.rows.length === 0) {
      throw ApiError.notFound('Invitation record not found for this proposal.');
    }

    await query(
      `UPDATE proposal_members SET status = $1 WHERE proposal_id = $2 AND student_id = $3`,
      [decision, proposalId, studentUserId]
    );

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
    const prop = await this.getProposalById(proposalId);

    const isLead = prop.submittedBy.id === requesterUserId;
    const isSelf = requesterUserId === targetStudentId;

    if (!isLead && !isSelf) {
      throw ApiError.forbidden('You do not have permission to remove this member.');
    }

    if (targetStudentId === prop.submittedBy.id) {
      throw ApiError.badRequest('The student team lead cannot be removed from their own proposal.');
    }

    if (prop.status !== 'DRAFT' && prop.status !== 'CHANGES_REQUESTED') {
      throw ApiError.badRequest('Members can only be removed while proposal is in DRAFT or CHANGES_REQUESTED.');
    }

    await query(
      `DELETE FROM proposal_members WHERE proposal_id = $1 AND student_id = $2`,
      [proposalId, targetStudentId]
    );

    logger.info(`[ProposalService] Student ${targetStudentId} removed from proposal ${proposalId}`);
    return this.getProposalById(proposalId);
  }

  /**
   * Get active project details
   */
  async getProjectById(projectId: string): Promise<unknown> {
    const projRes = await query(
      `SELECT 
        p.id, p.proposal_id AS "proposalId", p.title, p.abstract, p.domain,
        p.faculty_guide_id AS "facultyGuideId",
        fac_u.first_name AS "facFirstName", fac_u.last_name AS "facLastName", fac_u.email AS "facEmail",
        fac.designation AS "facDesignation", fac_d.code AS "facDeptCode",
        p.status, p.overall_progress AS "overallProgress", p.repository_url AS "repositoryUrl",
        p.created_at AS "createdAt", p.updated_at AS "updatedAt"
      FROM projects p
      JOIN users fac_u ON p.faculty_guide_id = fac_u.id
      JOIN faculty fac ON fac_u.id = fac.user_id
      LEFT JOIN departments fac_d ON fac_u.department_id = fac_d.id
      WHERE p.id = $1`,
      [projectId]
    );

    if (projRes.rows.length === 0) {
      throw ApiError.notFound(`Project with ID ${projectId} not found.`);
    }

    const row = projRes.rows[0];

    // Members
    const memRes = await query(
      `SELECT 
        pm.id, pm.student_id AS "studentId", pm.role_in_project AS "roleInProject", pm.joined_at AS "joinedAt",
        u.first_name AS "firstName", u.last_name AS "lastName", u.email,
        s.roll_number AS "rollNumber", s.semester
      FROM project_members pm
      JOIN users u ON pm.student_id = u.id
      JOIN students s ON u.id = s.user_id
      WHERE pm.project_id = $1
      ORDER BY pm.role_in_project DESC, u.first_name ASC`,
      [projectId]
    );

    // Milestones
    const mileRes = await query(
      `SELECT 
        id, milestone_number AS "milestoneNumber", title, description,
        start_date AS "startDate", due_date AS "dueDate",
        completion_percentage AS "completionPercentage", status,
        student_remarks AS "studentRemarks", faculty_remarks AS "facultyRemarks",
        completed_at AS "completedAt"
      FROM milestones
      WHERE project_id = $1
      ORDER BY milestone_number ASC`,
      [projectId]
    );

    return {
      id: row.id,
      proposalId: row.proposalId,
      title: row.title,
      abstract: row.abstract,
      domain: row.domain,
      facultyGuide: {
        id: row.facultyGuideId,
        name: `${row.facFirstName} ${row.facLastName}`,
        email: row.facEmail,
        designation: row.facDesignation,
        departmentCode: row.facDeptCode || 'AIDS',
      },
      status: row.status,
      overallProgress: row.overallProgress,
      repositoryUrl: row.repositoryUrl,
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
      members: memRes.rows.map((m) => ({
        id: m.id,
        studentId: m.studentId,
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        rollNumber: m.rollNumber,
        semester: m.semester,
        roleInProject: m.roleInProject,
        joinedAt: toIsoString(m.joinedAt),
      })),
      milestones: mileRes.rows.map((m) => ({
        id: m.id,
        milestoneNumber: m.milestoneNumber,
        title: m.title,
        description: m.description,
        startDate: toDateString(m.startDate),
        dueDate: toDateString(m.dueDate),
        completionPercentage: m.completionPercentage,
        status: m.status,
        studentRemarks: m.studentRemarks,
        facultyRemarks: m.facultyRemarks,
        completedAt: toIsoString(m.completedAt),
      })),
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
    if (userRole === 'STUDENT') {
      const memRes = await query(
        `SELECT id FROM project_members WHERE project_id = $1 AND student_id = $2`,
        [projectId, userId]
      );
      if (memRes.rows.length === 0) {
        throw ApiError.forbidden('Only allocated team members can update the project repository URL.');
      }
    } else if (userRole === 'FACULTY') {
      const facRes = await query(
        `SELECT id FROM projects WHERE id = $1 AND faculty_guide_id = $2`,
        [projectId, userId]
      );
      if (facRes.rows.length === 0) {
        throw ApiError.forbidden('Only the assigned faculty supervisor can update project settings.');
      }
    }

    await query(
      `UPDATE projects SET repository_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [repositoryUrl, projectId]
    );

    logger.info(`[ProposalService] Project ${projectId} repository URL updated to "${repositoryUrl}" by user ${userId}`);
  }
}

export const proposalService = new ProposalService();
