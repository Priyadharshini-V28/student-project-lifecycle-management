import bcrypt from 'bcryptjs';
import { User, Project, Department, AcademicBatch, AuditLog } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { AuthenticatedUser, UserRole } from '../types/auth.types';
import { UpdateProfileInput, ChangePasswordInput } from '../validators/user.validator';

export class UserService {
  /**
   * Get full user profile with department and specialized details
   */
  async getUserProfile(userId: string): Promise<AuthenticatedUser & { activeProjectCount: number }> {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const dept = user.departmentId ? await Department.findById(user.departmentId) : null;
    let batchName: string | undefined;

    if (user.role === 'STUDENT' && user.studentProfile?.batchId) {
      const batch = await AcademicBatch.findById(user.studentProfile.batchId);
      batchName = batch?.name;
    }

    // Compute active project count based on role
    let activeProjectCount = 0;
    const activeStatuses = ['ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] as const;

    if (user.role === 'STUDENT') {
      activeProjectCount = await Project.countDocuments({
        'teamMembers.studentId': userId,
        status: { $in: activeStatuses },
      });
    } else if (user.role === 'FACULTY') {
      activeProjectCount = await Project.countDocuments({
        facultyGuideId: userId,
        status: { $in: activeStatuses },
      });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId,
      departmentCode: dept?.code || 'AIDS',
      departmentName: dept?.name || 'Department of Artificial Intelligence & Data Science',
      activeProjectCount,
      profile: {
        rollNumber: user.studentProfile?.rollNumber,
        semester: user.studentProfile?.semester,
        cgpa: user.studentProfile?.cgpa !== undefined ? Number(user.studentProfile.cgpa) : undefined,
        batchName: batchName || '2022-2026 Batch',
        employeeId: user.facultyProfile?.employeeId,
        designation: user.facultyProfile?.designation,
        specialization: user.facultyProfile?.specialization,
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
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // 1. Update basic user fields
    if (input.firstName) user.firstName = input.firstName;
    if (input.lastName) user.lastName = input.lastName;

    // 2. Update Student specific fields
    if (role === 'STUDENT') {
      if (!user.studentProfile) user.studentProfile = {};
      if (input.semester !== undefined) user.studentProfile.semester = input.semester;
      if (input.cgpa !== undefined) user.studentProfile.cgpa = input.cgpa;
      user.markModified('studentProfile');
    }

    // 3. Update Faculty specific fields
    if (role === 'FACULTY') {
      if (!user.facultyProfile) user.facultyProfile = {};
      if (input.designation !== undefined) user.facultyProfile.designation = input.designation;
      if (input.specialization !== undefined) user.facultyProfile.specialization = input.specialization;
      user.markModified('facultyProfile');
    }

    await user.save();

    logger.info(`Profile updated successfully for user ID: ${userId}`);
    return this.getUserProfile(userId);
  }

  /**
   * Change user password securely
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Validate current password
    const isCurrentValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(input.newPassword, salt);
    await user.save();

    // Record in audit log
    await AuditLog.create({
      userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
      details: { status: 'success' },
    });

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

    const projects = await Project.find({ 'teamMembers.studentId': userId });

    const formattedProjects = await Promise.all(
      projects.map(async (p) => {
        const guide = await User.findById(p.facultyGuideId);
        const memberInfo = p.teamMembers.find((m) => m.studentId === userId);

        return {
          projectId: p.id,
          title: p.title,
          domain: p.domain,
          status: p.status,
          progress: p.overallProgress,
          roleInProject: memberInfo?.roleInProject || 'MEMBER',
          facultyGuide: guide ? `${guide.firstName} ${guide.lastName}` : 'Unassigned',
        };
      })
    );

    return {
      ...profile,
      projects: formattedProjects,
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

    const projects = await Project.find({ facultyGuideId: userId });

    const formattedProjects = await Promise.all(
      projects.map(async (p) => {
        const leadMember = p.teamMembers.find((m) => m.roleInProject === 'LEAD');
        const leadUser = leadMember ? await User.findById(leadMember.studentId) : null;

        return {
          projectId: p.id,
          title: p.title,
          domain: p.domain,
          status: p.status,
          progress: p.overallProgress,
          studentLead: leadUser ? `${leadUser.firstName} ${leadUser.lastName}` : 'Unassigned',
          allocatedAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
        };
      })
    );

    const pendingReviewsCount = await Project.countDocuments({
      facultyGuideId: userId,
      status: 'UNDER_REVIEW',
    });

    const user = await User.findById(userId);
    const maxQuota = user?.facultyProfile?.maxProjects || 5;

    return {
      ...profile,
      maxQuota,
      currentlyAssigned: projects.length,
      remainingCapacity: Math.max(0, maxQuota - projects.length),
      pendingReviewsCount,
      assignedProjects: formattedProjects,
    };
  }
}

export const userService = new UserService();
