import crypto from 'crypto';
import { Project, AuditLog, User } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import {
  UpdateProgressInput,
  ReviewMilestoneInput,
  CreateMilestoneInput,
  UpdateScheduleInput,
} from '../validators/milestone.validator';

export interface MilestoneResponseDto {
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
}

export interface ProjectMilestonesOverviewDto {
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  overallProgress: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  overdueCount: number;
  milestones: MilestoneResponseDto[];
}

export class MilestoneService {
  /**
   * Get all milestones for a project with RBAC access control
   */
  async getProjectMilestones(
    projectId: string,
    userId: string,
    role: string
  ): Promise<ProjectMilestonesOverviewDto> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Role-based Access Control
    if (role === 'STUDENT') {
      const isMember = project.teamMembers.some((m) => m.studentId === userId);
      if (!isMember) {
        throw ApiError.forbidden('Access denied: You are not a member of this project team.');
      }
    } else if (role === 'FACULTY') {
      if (project.facultyGuideId !== userId) {
        throw ApiError.forbidden('Access denied: You are not the assigned faculty supervisor for this project.');
      }
    }
    // ADMIN has institutional access to all projects

    const now = new Date();
    let overdueCount = 0;
    let completedCount = 0;

    const milestones: MilestoneResponseDto[] = (project.milestones || [])
      .sort((a, b) => a.milestoneNumber - b.milestoneNumber)
      .map((m) => {
        const isOverdue = m.status !== 'COMPLETED' && new Date(m.dueDate) < now;
        if (isOverdue) overdueCount++;
        if (m.status === 'COMPLETED') completedCount++;

        return {
          id: m._id ? String(m._id) : String(m.milestoneNumber),
          milestoneNumber: m.milestoneNumber,
          title: m.title,
          description: m.description || '',
          startDate: m.startDate ? m.startDate.toISOString() : '',
          dueDate: m.dueDate ? m.dueDate.toISOString() : '',
          completionPercentage: m.completionPercentage || 0,
          status: isOverdue && m.status === 'PENDING' ? 'OVERDUE' : (m.status as any),
          isOverdue,
          studentRemarks: m.studentRemarks || null,
          facultyRemarks: m.facultyRemarks || null,
          completedAt: m.completedAt ? m.completedAt.toISOString() : null,
        };
      });

    return {
      projectId: project.id,
      projectTitle: project.title,
      projectStatus: project.status,
      overallProgress: project.overallProgress || 0,
      milestonesTotal: milestones.length,
      milestonesCompleted: completedCount,
      overdueCount,
      milestones,
    };
  }

  /**
   * Student updates progress and remarks on an assigned milestone
   */
  async updateMilestoneProgress(
    projectId: string,
    milestoneId: string,
    input: UpdateProgressInput,
    studentUserId: string
  ): Promise<{ milestone: MilestoneResponseDto; overallProgress: number }> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Verify student is an active team member of this project
    const isMember = project.teamMembers.some((m) => m.studentId === studentUserId);
    if (!isMember) {
      throw ApiError.forbidden('Access denied: Only members of this project can submit milestone progress updates.');
    }

    // Locate milestone
    const milestone = project.milestones.find(
      (m) => String(m._id) === milestoneId || String(m.milestoneNumber) === milestoneId
    );

    if (!milestone) {
      throw ApiError.notFound('Milestone not found in this project');
    }

    // Update progress
    milestone.completionPercentage = input.completionPercentage;
    if (input.studentRemarks !== undefined) {
      milestone.studentRemarks = input.studentRemarks;
    }

    // Auto-transition PENDING to IN_PROGRESS when work begins
    if (milestone.status === 'PENDING' && input.completionPercentage > 0) {
      milestone.status = 'IN_PROGRESS';
    }

    // Recalculate project overall progress
    const totalMilestones = project.milestones.length;
    if (totalMilestones > 0) {
      const sumProgress = project.milestones.reduce((acc, m) => acc + (m.completionPercentage || 0), 0);
      project.overallProgress = Math.round(sumProgress / totalMilestones);
    }

    // Transition project from ALLOCATED to IN_PROGRESS once work commences
    if (project.status === 'ALLOCATED' && project.overallProgress > 0) {
      project.status = 'IN_PROGRESS';
    }

    await project.save();

    // Audit Log
    await AuditLog.create({
      userId: studentUserId,
      action: 'MILESTONE_PROGRESS_UPDATED',
      entityType: 'PROJECT',
      entityId: project.id,
      details: {
        milestoneId: milestone._id,
        milestoneNumber: milestone.milestoneNumber,
        completionPercentage: input.completionPercentage,
        studentRemarks: input.studentRemarks,
        overallProgress: project.overallProgress,
      },
    });

    logger.info(
      `[MilestoneService] Progress for M${milestone.milestoneNumber} in project ${projectId} updated to ${input.completionPercentage}% by student ${studentUserId}`
    );

    // Notify assigned faculty guide
    try {
      await notificationService.notifyMilestoneProgress({
        projectId: project.id,
        projectTitle: project.title,
        milestoneId: String(milestone._id),
        milestoneNumber: milestone.milestoneNumber,
        milestoneTitle: milestone.title,
        completionPercentage: input.completionPercentage,
        studentRemarks: input.studentRemarks,
        facultyGuideId: project.facultyGuideId,
      });
    } catch (err) {
      logger.error('[MilestoneService] Non-fatal notification error on progress update:', err);
    }

    const isOverdue = milestone.status !== 'COMPLETED' && new Date(milestone.dueDate) < new Date();

    return {
      milestone: {
        id: String(milestone._id),
        milestoneNumber: milestone.milestoneNumber,
        title: milestone.title,
        description: milestone.description || '',
        startDate: milestone.startDate ? milestone.startDate.toISOString() : '',
        dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : '',
        completionPercentage: milestone.completionPercentage,
        status: milestone.status as any,
        isOverdue,
        studentRemarks: milestone.studentRemarks || null,
        facultyRemarks: milestone.facultyRemarks || null,
        completedAt: milestone.completedAt ? milestone.completedAt.toISOString() : null,
      },
      overallProgress: project.overallProgress,
    };
  }

  /**
   * Faculty Guide or Administrator reviews milestone deliverables, marks status & provides feedback
   */
  async reviewMilestone(
    projectId: string,
    milestoneId: string,
    input: ReviewMilestoneInput,
    evaluatorUserId: string,
    role: string
  ): Promise<{ milestone: MilestoneResponseDto; overallProgress: number }> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    // Check authority: must be project guide or administrator
    if (role !== 'ADMIN' && project.facultyGuideId !== evaluatorUserId) {
      throw ApiError.forbidden('Access denied: Only the assigned faculty supervisor or an administrator can review milestone deliverables.');
    }

    const milestone = project.milestones.find(
      (m) => String(m._id) === milestoneId || String(m.milestoneNumber) === milestoneId
    );

    if (!milestone) {
      throw ApiError.notFound('Milestone not found in this project');
    }

    milestone.status = input.status;
    if (input.facultyRemarks !== undefined) {
      milestone.facultyRemarks = input.facultyRemarks;
    }

    if (input.completionPercentage !== undefined) {
      milestone.completionPercentage = input.completionPercentage;
    }

    // If marked COMPLETED, guarantee 100% completion & completion timestamp
    if (input.status === 'COMPLETED') {
      milestone.completionPercentage = 100;
      milestone.completedAt = new Date();
    } else {
      milestone.completedAt = undefined;
    }

    // Recalculate project overall progress
    const totalMilestones = project.milestones.length;
    if (totalMilestones > 0) {
      const sumProgress = project.milestones.reduce((acc, m) => acc + (m.completionPercentage || 0), 0);
      project.overallProgress = Math.round(sumProgress / totalMilestones);
    }

    await project.save();

    // Audit Log
    await AuditLog.create({
      userId: evaluatorUserId,
      action: 'MILESTONE_REVIEWED',
      entityType: 'PROJECT',
      entityId: project.id,
      details: {
        milestoneId: milestone._id,
        milestoneNumber: milestone.milestoneNumber,
        status: input.status,
        facultyRemarks: input.facultyRemarks,
        completionPercentage: milestone.completionPercentage,
        overallProgress: project.overallProgress,
      },
    });

    logger.info(
      `[MilestoneService] Milestone M${milestone.milestoneNumber} reviewed as ${input.status} by ${evaluatorUserId}`
    );

    // Notify project team students
    try {
      const teamMemberIds = (project.teamMembers || []).map((m: any) => m.studentId);
      await notificationService.notifyMilestoneReview({
        projectId: project.id,
        projectTitle: project.title,
        milestoneId: String(milestone._id),
        milestoneNumber: milestone.milestoneNumber,
        milestoneTitle: milestone.title,
        status: input.status,
        facultyRemarks: input.facultyRemarks,
        teamMemberIds,
      });
    } catch (err) {
      logger.error('[MilestoneService] Non-fatal notification error on milestone review:', err);
    }

    const isOverdue = milestone.status !== 'COMPLETED' && new Date(milestone.dueDate) < new Date();

    return {
      milestone: {
        id: String(milestone._id),
        milestoneNumber: milestone.milestoneNumber,
        title: milestone.title,
        description: milestone.description || '',
        startDate: milestone.startDate ? milestone.startDate.toISOString() : '',
        dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : '',
        completionPercentage: milestone.completionPercentage,
        status: milestone.status as any,
        isOverdue,
        studentRemarks: milestone.studentRemarks || null,
        facultyRemarks: milestone.facultyRemarks || null,
        completedAt: milestone.completedAt ? milestone.completedAt.toISOString() : null,
      },
      overallProgress: project.overallProgress,
    };
  }

  /**
   * Faculty Guide or Administrator appends an ad-hoc milestone to the project
   */
  async createMilestone(
    projectId: string,
    input: CreateMilestoneInput,
    userId: string,
    role: string
  ): Promise<MilestoneResponseDto> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (role !== 'ADMIN' && project.facultyGuideId !== userId) {
      throw ApiError.forbidden('Access denied: Only the assigned faculty guide or an administrator can add milestones.');
    }

    const nextNumber =
      project.milestones.length > 0
        ? Math.max(...project.milestones.map((m) => m.milestoneNumber)) + 1
        : 1;

    const newMilestoneId = crypto.randomUUID();
    const newMilestone = {
      _id: newMilestoneId,
      milestoneNumber: nextNumber,
      title: input.title,
      description: input.description || '',
      startDate: new Date(input.startDate),
      dueDate: new Date(input.dueDate),
      completionPercentage: input.completionPercentage || 0,
      status: ((input.completionPercentage || 0) > 0 ? 'IN_PROGRESS' : 'PENDING') as any,
    };

    project.milestones.push(newMilestone as any);

    // Recalculate progress
    const sumProgress = project.milestones.reduce((acc, m) => acc + (m.completionPercentage || 0), 0);
    project.overallProgress = Math.round(sumProgress / project.milestones.length);

    await project.save();

    await AuditLog.create({
      userId,
      action: 'MILESTONE_CREATED',
      entityType: 'PROJECT',
      entityId: project.id,
      details: {
        milestoneId: newMilestoneId,
        milestoneNumber: nextNumber,
        title: input.title,
      },
    });

    return {
      id: newMilestoneId,
      milestoneNumber: nextNumber,
      title: newMilestone.title,
      description: newMilestone.description,
      startDate: newMilestone.startDate.toISOString(),
      dueDate: newMilestone.dueDate.toISOString(),
      completionPercentage: newMilestone.completionPercentage,
      status: newMilestone.status,
      isOverdue: false,
      studentRemarks: null,
      facultyRemarks: null,
      completedAt: null,
    };
  }

  /**
   * Faculty Guide or Administrator updates schedule and details of a milestone
   */
  async updateMilestoneSchedule(
    projectId: string,
    milestoneId: string,
    input: UpdateScheduleInput,
    userId: string,
    role: string
  ): Promise<MilestoneResponseDto> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (role !== 'ADMIN' && project.facultyGuideId !== userId) {
      throw ApiError.forbidden('Access denied: Only the assigned faculty guide or an administrator can adjust milestone schedules.');
    }

    const milestone = project.milestones.find(
      (m) => String(m._id) === milestoneId || String(m.milestoneNumber) === milestoneId
    );

    if (!milestone) {
      throw ApiError.notFound('Milestone not found in this project');
    }

    if (input.title) milestone.title = input.title;
    if (input.description !== undefined) milestone.description = input.description;
    if (input.startDate) milestone.startDate = new Date(input.startDate);
    if (input.dueDate) milestone.dueDate = new Date(input.dueDate);

    if (milestone.dueDate < milestone.startDate) {
      throw ApiError.badRequest('Due date cannot be before start date.');
    }

    await project.save();

    await AuditLog.create({
      userId,
      action: 'MILESTONE_SCHEDULE_UPDATED',
      entityType: 'PROJECT',
      entityId: project.id,
      details: {
        milestoneId: milestone._id,
        milestoneNumber: milestone.milestoneNumber,
        newDueDate: milestone.dueDate,
      },
    });

    const isOverdue = milestone.status !== 'COMPLETED' && new Date(milestone.dueDate) < new Date();

    return {
      id: String(milestone._id),
      milestoneNumber: milestone.milestoneNumber,
      title: milestone.title,
      description: milestone.description || '',
      startDate: milestone.startDate ? milestone.startDate.toISOString() : '',
      dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : '',
      completionPercentage: milestone.completionPercentage,
      status: milestone.status as any,
      isOverdue,
      studentRemarks: milestone.studentRemarks || null,
      facultyRemarks: milestone.facultyRemarks || null,
      completedAt: milestone.completedAt ? milestone.completedAt.toISOString() : null,
    };
  }

  /**
   * Scan active projects and milestones for upcoming or overdue deadlines
   */
  async checkAndNotifyMilestoneDeadlines(projectId?: string): Promise<{ notifiedCount: number }> {
    const filter: Record<string, any> = { status: { $in: ['ALLOCATED', 'IN_PROGRESS'] } };
    if (projectId) filter._id = projectId;

    const projects = await Project.find(filter);
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    let notifiedCount = 0;

    for (const project of projects) {
      const teamMemberIds = (project.teamMembers || []).map((m: any) => m.studentId);
      if (teamMemberIds.length === 0) continue;

      for (const m of project.milestones || []) {
        if (m.status === 'COMPLETED') continue;

        const due = new Date(m.dueDate);
        const isOverdue = due < now;
        const isApproaching = !isOverdue && due <= threeDaysFromNow;

        if (isOverdue || isApproaching) {
          try {
            await notificationService.notifyMilestoneDeadline({
              projectId: project.id,
              projectTitle: project.title,
              milestoneId: String(m._id),
              milestoneNumber: m.milestoneNumber,
              milestoneTitle: m.title,
              dueDate: due,
              isOverdue,
              teamMemberIds,
            });
            notifiedCount++;
          } catch (err) {
            logger.error('[MilestoneService] Non-fatal notification error on deadline check:', err);
          }
        }
      }
    }

    return { notifiedCount };
  }
}

export const milestoneService = new MilestoneService();
