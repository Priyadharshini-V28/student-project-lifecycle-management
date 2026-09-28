import bcrypt from 'bcryptjs';
import { query, transaction } from '../db';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { AuthenticatedUser, UserRole } from '../types/auth.types';
import { UpdateProfileInput, ChangePasswordInput } from '../validators/user.validator';

export class UserService {
  /**
   * Get full user profile with department and specialized details
   */
  async getUserProfile(userId: string): Promise<AuthenticatedUser & { activeProjectCount: number }> {
    const userRes = await query(
      `SELECT 
        u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName", 
        u.role, u.department_id AS "departmentId",
        d.code AS "departmentCode", d.name AS "departmentName",
        s.roll_number AS "rollNumber", s.semester, s.cgpa, b.name AS "batchName",
        f.employee_id AS "employeeId", f.designation, f.specialization
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN students s ON u.id = s.user_id
      LEFT JOIN academic_batches b ON s.batch_id = b.id
      LEFT JOIN faculty f ON u.id = f.user_id
      WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    const row = userRes.rows[0];

    // Compute active project count based on role
    let activeProjectCount = 0;
    if (row.role === 'STUDENT') {
      const pCountRes = await query(
        `SELECT COUNT(p.id) AS count 
         FROM project_members pm
         JOIN projects p ON pm.project_id = p.id
         WHERE pm.student_id = $1 AND p.status IN ('ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED')`,
        [userId]
      );
      activeProjectCount = parseInt(pCountRes.rows[0]?.count || '0', 10);
    } else if (row.role === 'FACULTY') {
      const pCountRes = await query(
        `SELECT COUNT(id) AS count 
         FROM projects 
         WHERE faculty_guide_id = $1 AND status IN ('ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED')`,
        [userId]
      );
      activeProjectCount = parseInt(pCountRes.rows[0]?.count || '0', 10);
    }

    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role as UserRole,
      departmentId: row.departmentId,
      departmentCode: row.departmentCode,
      departmentName: row.departmentName,
      activeProjectCount,
      profile: {
        rollNumber: row.rollNumber,
        semester: row.semester,
        cgpa: row.cgpa ? parseFloat(row.cgpa) : undefined,
        batchName: row.batchName,
        employeeId: row.employeeId,
        designation: row.designation,
        specialization: row.specialization,
      },
    };
  }

  /**
   * Update permitted profile fields
   */
  async updateUserProfile(
    userId: string,
    role: UserRole,
    input: UpdateProfileInput
  ): Promise<AuthenticatedUser & { activeProjectCount: number }> {
    await transaction(async (client) => {
      // 1. Update basic user table if names provided
      if (input.firstName || input.lastName) {
        const updates: string[] = [];
        const params: unknown[] = [userId];

        if (input.firstName) {
          params.push(input.firstName);
          updates.push(`first_name = $${params.length}`);
        }
        if (input.lastName) {
          params.push(input.lastName);
          updates.push(`last_name = $${params.length}`);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');

        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $1`,
          params
        );
      }

      // 2. Update Student specific fields
      if (role === 'STUDENT' && (input.semester !== undefined || input.cgpa !== undefined)) {
        const studentUpdates: string[] = [];
        const studentParams: unknown[] = [userId];

        if (input.semester !== undefined) {
          studentParams.push(input.semester);
          studentUpdates.push(`semester = $${studentParams.length}`);
        }
        if (input.cgpa !== undefined) {
          studentParams.push(input.cgpa);
          studentUpdates.push(`cgpa = $${studentParams.length}`);
        }

        if (studentUpdates.length > 0) {
          await client.query(
            `UPDATE students SET ${studentUpdates.join(', ')} WHERE user_id = $1`,
            studentParams
          );
        }
      }

      // 3. Update Faculty specific fields
      if (role === 'FACULTY' && (input.designation || input.specialization)) {
        const facultyUpdates: string[] = [];
        const facultyParams: unknown[] = [userId];

        if (input.designation) {
          facultyParams.push(input.designation);
          facultyUpdates.push(`designation = $${facultyParams.length}`);
        }
        if (input.specialization) {
          facultyParams.push(input.specialization);
          facultyUpdates.push(`specialization = $${facultyParams.length}`);
        }

        if (facultyUpdates.length > 0) {
          await client.query(
            `UPDATE faculty SET ${facultyUpdates.join(', ')} WHERE user_id = $1`,
            facultyParams
          );
        }
      }
    });

    logger.info(`Profile updated successfully for user ID: ${userId}`);
    return this.getUserProfile(userId);
  }

  /**
   * Change user password securely
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    // 1. Fetch current hash
    const userRes = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      throw ApiError.notFound('User not found');
    }

    const { password_hash } = userRes.rows[0];

    // 2. Validate current password
    const isCurrentValid = await bcrypt.compare(input.currentPassword, password_hash);
    if (!isCurrentValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(input.newPassword, salt);

    // 4. Update in database
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, userId]
    );

    // 5. Record in audit log
    await query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
       VALUES ($1, 'PASSWORD_CHANGED', 'USER', $1, '{"status": "success"}')`,
      [userId]
    );

    logger.info(`Password changed successfully for user ID: ${userId}`);
  }

  /**
   * Get specialized student view
   */
  async getStudentAcademicProfile(userId: string) {
    const profile = await this.getUserProfile(userId);
    if (profile.role !== 'STUDENT') {
      throw ApiError.forbidden('Only students have access to student academic profile');
    }

    // Fetch projects for this student
    const projectsRes = await query(
      `SELECT 
        p.id AS "projectId", p.title, p.domain, p.status, p.overall_progress AS "progress",
        pm.role_in_project AS "roleInProject",
        CONCAT(u_guide.first_name, ' ', u_guide.last_name) AS "facultyGuide"
       FROM project_members pm
       JOIN projects p ON pm.project_id = p.id
       JOIN users u_guide ON p.faculty_guide_id = u_guide.id
       WHERE pm.student_id = $1`,
      [userId]
    );

    return {
      ...profile,
      projects: projectsRes.rows,
    };
  }

  /**
   * Get specialized faculty view
   */
  async getFacultyAcademicProfile(userId: string) {
    const profile = await this.getUserProfile(userId);
    if (profile.role !== 'FACULTY') {
      throw ApiError.forbidden('Only faculty members have access to faculty academic profile');
    }

    // Fetch assigned projects and capacity
    const projectsRes = await query(
      `SELECT 
        p.id AS "projectId", p.title, p.domain, p.status, p.overall_progress AS "progress",
        CONCAT(u_lead.first_name, ' ', u_lead.last_name) AS "studentLead",
        p.created_at AS "allocatedAt"
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id AND pm.role_in_project = 'LEAD'
       JOIN users u_lead ON pm.student_id = u_lead.id
       WHERE p.faculty_guide_id = $1`,
      [userId]
    );

    // Fetch pending reviews count
    const pendingReviewsRes = await query(
      `SELECT COUNT(p.id) AS count
       FROM projects p
       WHERE p.faculty_guide_id = $1 AND p.status = 'UNDER_REVIEW'`,
      [userId]
    );

    const facultyDetailsRes = await query(
      'SELECT max_projects AS "maxQuota" FROM faculty WHERE user_id = $1',
      [userId]
    );

    const maxQuota = facultyDetailsRes.rows[0]?.maxQuota || 5;

    return {
      ...profile,
      maxQuota,
      currentlyAssigned: projectsRes.rows.length,
      remainingCapacity: Math.max(0, maxQuota - projectsRes.rows.length),
      pendingReviewsCount: parseInt(pendingReviewsRes.rows[0]?.count || '0', 10),
      assignedProjects: projectsRes.rows,
    };
  }
}

export const userService = new UserService();
