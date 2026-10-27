import { Notification, INotification, NotificationType, User } from '../models';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export interface NotificationResponseDto {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  projectId?: string;
  proposalId?: string;
  documentId?: string;
  reviewId?: string;
  milestoneId?: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedNotificationsDto {
  notifications: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export class NotificationService {
  /**
   * Internal helper to create a single notification with idempotency and error safety
   */
  async createNotification(params: {
    recipientId: string;
    type: NotificationType;
    title: string;
    message: string;
    projectId?: string;
    proposalId?: string;
    documentId?: string;
    reviewId?: string;
    milestoneId?: string;
    link?: string;
    idempotencyKey?: string;
  }): Promise<INotification | null> {
    try {
      if (!params.recipientId) {
        logger.warn('[NotificationService] Skipped notification: No recipientId provided.');
        return null;
      }

      // Check if recipient exists in database
      const recipient = await User.findById(params.recipientId);
      if (!recipient) {
        logger.warn(`[NotificationService] Recipient ${params.recipientId} does not exist in system.`);
        return null;
      }

      // Idempotency check: avoid duplicate notification if key provided
      if (params.idempotencyKey) {
        const existing = await Notification.findOne({ idempotencyKey: params.idempotencyKey });
        if (existing) {
          logger.debug(`[NotificationService] Duplicate event prevented by idempotencyKey: ${params.idempotencyKey}`);
          return existing;
        }
      }

      const notif = await Notification.create({
        recipientId: params.recipientId,
        userId: params.recipientId,
        type: params.type,
        title: params.title,
        message: params.message,
        projectId: params.projectId,
        proposalId: params.proposalId,
        documentId: params.documentId,
        reviewId: params.reviewId,
        milestoneId: params.milestoneId,
        link: params.link,
        isRead: false,
        idempotencyKey: params.idempotencyKey,
        createdAt: new Date(),
      });

      logger.info(
        `[NotificationService] Notification "${params.title}" delivered to user ${params.recipientId} (${params.type})`
      );

      return notif;
    } catch (err: any) {
      // Gracefully handle duplicate key error if concurrent insertions hit idempotencyKey
      if (err.code === 11000 && params.idempotencyKey) {
        logger.debug(`[NotificationService] Caught concurrent duplicate key for ${params.idempotencyKey}`);
        return Notification.findOne({ idempotencyKey: params.idempotencyKey });
      }

      logger.error('[NotificationService] Non-fatal notification creation error:', err);
      return null;
    }
  }

  /**
   * Internal helper to broadcast notification to multiple distinct recipients
   */
  async createNotificationsForRecipients(
    recipientIds: string[],
    baseParams: {
      type: NotificationType;
      title: string;
      message: string;
      projectId?: string;
      proposalId?: string;
      documentId?: string;
      reviewId?: string;
      milestoneId?: string;
      link?: string;
      baseIdempotencyKey?: string;
    }
  ): Promise<(INotification | null)[]> {
    const distinctRecipients = Array.from(new Set(recipientIds.filter(Boolean)));
    const promises = distinctRecipients.map((recipientId) => {
      const idempotencyKey = baseParams.baseIdempotencyKey
        ? `${baseParams.baseIdempotencyKey}-${recipientId}`
        : undefined;

      return this.createNotification({
        ...baseParams,
        recipientId,
        idempotencyKey,
      });
    });

    return Promise.all(promises);
  }

  // --------------------------------------------------------------------------
  // Domain Event Notification Triggers
  // --------------------------------------------------------------------------

  /**
   * 1. Proposal Submissions & Resubmissions -> Notify assigned faculty
   */
  async notifyProposalSubmission(params: {
    proposalId: string;
    title: string;
    version: number;
    isResubmission: boolean;
    submitterName: string;
    assignedFacultyId?: string;
  }): Promise<void> {
    if (!params.assignedFacultyId) return;

    const type: NotificationType = params.isResubmission
      ? 'PROPOSAL_RESUBMITTED'
      : 'PROPOSAL_SUBMITTED';

    const title = params.isResubmission
      ? `Proposal Resubmitted (v${params.version})`
      : 'New Proposal Submitted';

    const message = `Student lead ${params.submitterName} submitted "${params.title}" (v${params.version}) for your topic appraisal.`;

    await this.createNotification({
      recipientId: params.assignedFacultyId,
      type,
      title,
      message,
      proposalId: params.proposalId,
      link: `/proposals/${params.proposalId}`,
      idempotencyKey: `proposal-submission-${params.proposalId}-v${params.version}-${params.assignedFacultyId}`,
    });
  }

  /**
   * 2. Faculty Reviews & Appraisals -> Notify project team students
   */
  async notifyProposalReview(params: {
    proposalId: string;
    title: string;
    version: number;
    status: string;
    facultyComments?: string;
    memberStudentIds: string[];
    evaluatorName: string;
    projectId?: string;
  }): Promise<void> {
    let type: NotificationType = 'PROPOSAL_APPRAISED';
    let title = `Proposal Appraised: ${params.status}`;

    if (params.status === 'APPROVED') {
      type = 'PROPOSAL_APPROVED';
      title = 'Project Proposal Approved!';
    } else if (params.status === 'CHANGES_REQUESTED') {
      type = 'PROPOSAL_CHANGES_REQUESTED';
      title = 'Proposal Revisions Requested';
    } else if (params.status === 'REJECTED') {
      type = 'PROPOSAL_REJECTED';
      title = 'Proposal Rejected';
    }

    const commentsSnippet = params.facultyComments
      ? ` Remarks: "${params.facultyComments}"`
      : '';
    const message = `Faculty supervisor ${params.evaluatorName} marked "${params.title}" as ${params.status}.${commentsSnippet}`;

    await this.createNotificationsForRecipients(params.memberStudentIds, {
      type,
      title,
      message,
      proposalId: params.proposalId,
      projectId: params.projectId,
      link: params.projectId ? `/projects/${params.projectId}` : `/proposals/${params.proposalId}`,
      baseIdempotencyKey: `proposal-review-${params.proposalId}-v${params.version}-${params.status}`,
    });
  }

  /**
   * 3. Document Management -> Notify assigned faculty or student team
   */
  async notifyDocumentUpload(params: {
    projectId: string;
    projectTitle: string;
    documentId: string;
    documentType: string;
    version: number;
    uploaderId: string;
    uploaderName: string;
    uploaderRole: string;
    facultyGuideId?: string;
    teamMemberIds: string[];
  }): Promise<void> {
    if (params.uploaderRole === 'STUDENT') {
      // Notify assigned faculty supervisor
      if (params.facultyGuideId) {
        const isRevised = params.version > 1;
        const type: NotificationType = isRevised ? 'DOCUMENT_REVISED' : 'DOCUMENT_UPLOADED';
        const title = isRevised
          ? `Revised Document: ${params.documentType} (v${params.version})`
          : `New Deliverable: ${params.documentType}`;
        const message = `Student ${params.uploaderName} uploaded ${params.documentType} v${params.version} for project "${params.projectTitle}".`;

        await this.createNotification({
          recipientId: params.facultyGuideId,
          type,
          title,
          message,
          projectId: params.projectId,
          documentId: params.documentId,
          link: `/projects/${params.projectId}/documents`,
          idempotencyKey: `doc-upload-${params.documentId}-${params.facultyGuideId}`,
        });
      }
    } else if (params.uploaderRole === 'FACULTY') {
      // Notify student team members
      const title = `Faculty Deliverable: ${params.documentType}`;
      const message = `Faculty guide ${params.uploaderName} uploaded ${params.documentType} (v${params.version}) for project "${params.projectTitle}".`;

      await this.createNotificationsForRecipients(params.teamMemberIds, {
        type: 'DOCUMENT_UPLOADED',
        title,
        message,
        projectId: params.projectId,
        documentId: params.documentId,
        link: `/projects/${params.projectId}/documents`,
        baseIdempotencyKey: `doc-upload-${params.documentId}`,
      });
    }
  }

  /**
   * 4. Milestone Progress Updated by Student -> Notify assigned faculty guide
   */
  async notifyMilestoneProgress(params: {
    projectId: string;
    projectTitle: string;
    milestoneId: string;
    milestoneNumber: number;
    milestoneTitle: string;
    completionPercentage: number;
    studentRemarks?: string;
    facultyGuideId?: string;
  }): Promise<void> {
    if (!params.facultyGuideId) return;

    const title = `Milestone M${params.milestoneNumber} Progress: ${params.completionPercentage}%`;
    const message = `Team reported ${params.completionPercentage}% completion on "${params.milestoneTitle}". ${params.studentRemarks ? `Remarks: "${params.studentRemarks}"` : ''}`;

    await this.createNotification({
      recipientId: params.facultyGuideId,
      type: 'MILESTONE_UPDATED',
      title,
      message,
      projectId: params.projectId,
      milestoneId: params.milestoneId,
      link: `/projects/${params.projectId}/milestones`,
      idempotencyKey: `milestone-progress-${params.projectId}-m${params.milestoneNumber}-${params.completionPercentage}`,
    });
  }

  /**
   * 5. Milestone Deliverable Reviewed by Faculty -> Notify student team members
   */
  async notifyMilestoneReview(params: {
    projectId: string;
    projectTitle: string;
    milestoneId: string;
    milestoneNumber: number;
    milestoneTitle: string;
    status: string;
    facultyRemarks?: string;
    teamMemberIds: string[];
  }): Promise<void> {
    const title = `Milestone M${params.milestoneNumber} Evaluated: ${params.status}`;
    const message = `Faculty guide evaluated "${params.milestoneTitle}" as ${params.status}. ${params.facultyRemarks ? `Feedback: "${params.facultyRemarks}"` : ''}`;

    await this.createNotificationsForRecipients(params.teamMemberIds, {
      type: 'MILESTONE_REVIEWED',
      title,
      message,
      projectId: params.projectId,
      milestoneId: params.milestoneId,
      link: `/projects/${params.projectId}/milestones`,
      baseIdempotencyKey: `milestone-review-${params.projectId}-m${params.milestoneNumber}-${params.status}`,
    });
  }

  /**
   * 6. Milestone Deadline Approaching or Overdue -> Notify student team members
   */
  async notifyMilestoneDeadline(params: {
    projectId: string;
    projectTitle: string;
    milestoneId: string;
    milestoneNumber: number;
    milestoneTitle: string;
    dueDate: Date;
    isOverdue: boolean;
    teamMemberIds: string[];
  }): Promise<void> {
    const type: NotificationType = params.isOverdue ? 'MILESTONE_OVERDUE' : 'DEADLINE_APPROACHING';
    const title = params.isOverdue
      ? `Milestone M${params.milestoneNumber} is Overdue!`
      : `Upcoming Deadline: Milestone M${params.milestoneNumber}`;
    const dateStr = params.dueDate.toISOString().substring(0, 10);
    const message = `Milestone "${params.milestoneTitle}" for project "${params.projectTitle}" is ${params.isOverdue ? 'overdue' : 'due soon'} (Target Due Date: ${dateStr}).`;

    await this.createNotificationsForRecipients(params.teamMemberIds, {
      type,
      title,
      message,
      projectId: params.projectId,
      milestoneId: params.milestoneId,
      link: `/projects/${params.projectId}/milestones`,
      baseIdempotencyKey: `deadline-${params.milestoneId}-${dateStr}-${params.isOverdue ? 'overdue' : 'upcoming'}`,
    });
  }

  /**
   * 7. Project Evaluation Hook (Stage 12 readiness without implementing Stage 12 logic)
   */
  async notifyProjectEvaluation(params: {
    projectId: string;
    projectTitle: string;
    reviewId?: string;
    remarks?: string;
    teamMemberIds: string[];
    facultyGuideId?: string;
  }): Promise<void> {
    const title = `Project Evaluation Recorded: ${params.projectTitle}`;
    const message = `A formal review and evaluation entry has been recorded. ${params.remarks ? `Remarks: "${params.remarks}"` : ''}`;

    const allRecipients = [
      ...params.teamMemberIds,
      ...(params.facultyGuideId ? [params.facultyGuideId] : []),
    ];

    await this.createNotificationsForRecipients(allRecipients, {
      type: 'PROJECT_EVALUATION',
      title,
      message,
      projectId: params.projectId,
      reviewId: params.reviewId,
      link: `/projects/${params.projectId}`,
      baseIdempotencyKey: `project-eval-${params.projectId}-${params.reviewId || 'general'}`,
    });
  }

  // --------------------------------------------------------------------------
  // User Notification Retrieval & State Mutation APIs
  // --------------------------------------------------------------------------

  /**
   * Get paginated notifications for authenticated user with optional read status filter
   */
  async getUserNotifications(
    userId: string,
    query: { page?: number; limit?: number; isRead?: boolean }
  ): Promise<PaginatedNotificationsDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { recipientId: userId };
    if (query.isRead !== undefined) {
      filter.isRead = query.isRead;
    }

    const [docs, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

    const notifications: NotificationResponseDto[] = docs.map((doc) => ({
      id: doc.id,
      recipientId: doc.recipientId,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      projectId: doc.projectId,
      proposalId: doc.proposalId,
      documentId: doc.documentId,
      reviewId: doc.reviewId,
      milestoneId: doc.milestoneId,
      link: doc.link,
      isRead: doc.isRead,
      readAt: doc.readAt ? doc.readAt.toISOString() : undefined,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    }));

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    };
  }

  /**
   * Get total count of unread notifications for authenticated user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ recipientId: userId, isRead: false });
  }

  /**
   * Mark a single notification as read with strict recipient ownership guard
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    const notif = await Notification.findById(notificationId);
    if (!notif) {
      throw ApiError.notFound('Notification not found');
    }

    if (notif.recipientId !== userId) {
      throw ApiError.forbidden('Access denied: You do not have permission to modify another user’s notification.');
    }

    if (!notif.isRead) {
      notif.isRead = true;
      notif.readAt = new Date();
      await notif.save();
    }

    return {
      id: notif.id,
      recipientId: notif.recipientId,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      projectId: notif.projectId,
      proposalId: notif.proposalId,
      documentId: notif.documentId,
      reviewId: notif.reviewId,
      milestoneId: notif.milestoneId,
      link: notif.link,
      isRead: notif.isRead,
      readAt: notif.readAt ? notif.readAt.toISOString() : undefined,
      createdAt: notif.createdAt ? notif.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Mark all notifications belonging to the authenticated user as read
   */
  async markAllNotificationsAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return { updatedCount: result.modifiedCount };
  }
}

export const notificationService = new NotificationService();
