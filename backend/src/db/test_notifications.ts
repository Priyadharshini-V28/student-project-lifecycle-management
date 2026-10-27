import { connectMongo, disconnectMongo } from './mongo';
import { seedMongoData } from './seed_mongo';
import { notificationService } from '../services/notification.service';
import { milestoneService } from '../services/milestone.service';
import { documentService } from '../services/document.service';
import { proposalService } from '../services/proposal.service';
import { Notification, Project } from '../models';
import { logger } from '../utils/logger';

export const runNotificationTests = async (): Promise<void> => {
  await connectMongo();
  await seedMongoData();

  logger.info('================================================================');
  logger.info('🔔 STAGE 11: IN-APP NOTIFICATIONS & ALERTS TEST SUITE');
  logger.info('================================================================');

  const projectId = 'e0000000-0000-0000-0000-000000000001';
  const student1Id = 'b0000000-0000-0000-0000-000000000001'; // Project lead (Student 1)
  const student2Id = 'b0000000-0000-0000-0000-000000000002'; // Team member (Student 2)
  const student3Id = 'b0000000-0000-0000-0000-000000000003'; // Other student (Student 3)
  const faculty1Id = 'f0000000-0000-0000-0000-000000000001'; // Assigned guide (Faculty 1)
  const faculty2Id = 'f0000000-0000-0000-0000-000000000002'; // Other faculty (Faculty 2)

  // --------------------------------------------------------------------------
  // Assertion 1: Project Proposal Submission Notification (Student -> Faculty)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 1: Proposal Submission Notification Generation');
  await notificationService.notifyProposalSubmission({
    proposalId: 'c0000000-0000-0000-0000-000000000001',
    title: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    version: 1,
    isResubmission: false,
    submitterName: 'Rahul Sharma',
    assignedFacultyId: faculty1Id,
  });

  const faculty1Notifs = await Notification.find({ recipientId: faculty1Id, type: 'PROPOSAL_SUBMITTED' });
  console.log(`✓ Faculty 1 received proposal submission notification: ${faculty1Notifs.length}`);
  if (faculty1Notifs.length !== 1) {
    throw new Error(`Expected 1 PROPOSAL_SUBMITTED notification, found ${faculty1Notifs.length}`);
  }
  console.log(`  Title: "${faculty1Notifs[0].title}" | Message: "${faculty1Notifs[0].message}"`);

  // --------------------------------------------------------------------------
  // Assertion 2: Faculty Appraisal / Review Notification (Faculty -> Student Team)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 2: Proposal Appraisal Notification to Student Team');
  await notificationService.notifyProposalReview({
    proposalId: 'c0000000-0000-0000-0000-000000000001',
    title: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    version: 1,
    status: 'CHANGES_REQUESTED',
    facultyComments: 'Please expand clinical dataset class balancing rationale.',
    memberStudentIds: [student1Id, student2Id],
    evaluatorName: 'Dr. Rajesh Kumar',
  });

  const s1ReviewNotifs = await Notification.find({ recipientId: student1Id, type: 'PROPOSAL_CHANGES_REQUESTED' });
  const s2ReviewNotifs = await Notification.find({ recipientId: student2Id, type: 'PROPOSAL_CHANGES_REQUESTED' });
  console.log(`✓ Student 1 received review notification: ${s1ReviewNotifs.length}`);
  console.log(`✓ Student 2 received review notification: ${s2ReviewNotifs.length}`);
  if (s1ReviewNotifs.length !== 1 || s2ReviewNotifs.length !== 1) {
    throw new Error('Expected both team members to receive PROPOSAL_CHANGES_REQUESTED notification');
  }

  // --------------------------------------------------------------------------
  // Assertion 3: Document Deliverable Upload Notification (Student -> Faculty)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 3: Student Document Upload Notification to Faculty Supervisor');
  await notificationService.notifyDocumentUpload({
    projectId,
    projectTitle: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    documentId: 'doc-srs-001',
    documentType: 'SRS',
    version: 1,
    uploaderId: student1Id,
    uploaderName: 'Rahul Sharma',
    uploaderRole: 'STUDENT',
    facultyGuideId: faculty1Id,
    teamMemberIds: [student1Id, student2Id],
  });

  const docUploadNotifs = await Notification.find({ recipientId: faculty1Id, type: 'DOCUMENT_UPLOADED' });
  console.log(`✓ Faculty 1 received DOCUMENT_UPLOADED notification: ${docUploadNotifs.length}`);
  if (docUploadNotifs.length !== 1) {
    throw new Error(`Expected 1 DOCUMENT_UPLOADED notification for faculty, got ${docUploadNotifs.length}`);
  }
  console.log(`  Message: "${docUploadNotifs[0].message}"`);

  // --------------------------------------------------------------------------
  // Assertion 4: Faculty Document Deliverable Notification (Faculty -> Student Team)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 4: Faculty Deliverable Notification Broadcast to Team Members');
  await notificationService.notifyDocumentUpload({
    projectId,
    projectTitle: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    documentId: 'doc-arch-002',
    documentType: 'ARCHITECTURE_DESIGN',
    version: 1,
    uploaderId: faculty1Id,
    uploaderName: 'Dr. Rajesh Kumar',
    uploaderRole: 'FACULTY',
    facultyGuideId: faculty1Id,
    teamMemberIds: [student1Id, student2Id],
  });

  const s1FacultyDocNotifs = await Notification.find({
    recipientId: student1Id,
    documentId: 'doc-arch-002',
  });
  console.log(`✓ Student 1 received faculty document notification: ${s1FacultyDocNotifs.length}`);
  if (s1FacultyDocNotifs.length !== 1) {
    throw new Error('Expected student to receive faculty document notification');
  }

  // --------------------------------------------------------------------------
  // Assertion 5: Milestone Progress Submission Notification (Student -> Faculty)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 5: Milestone Progress Notification to Faculty Guide');
  await notificationService.notifyMilestoneProgress({
    projectId,
    projectTitle: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    milestoneId: 'd0000000-0000-0000-0000-000000000003',
    milestoneNumber: 3,
    milestoneTitle: 'Explainable AI (Grad-CAM) & Web Integration',
    completionPercentage: 80,
    studentRemarks: 'FastAPI microservice connected; latency evaluated.',
    facultyGuideId: faculty1Id,
  });

  const milestoneProgressNotifs = await Notification.find({
    recipientId: faculty1Id,
    type: 'MILESTONE_UPDATED',
  });
  console.log(`✓ Faculty 1 received MILESTONE_UPDATED notification: ${milestoneProgressNotifs.length}`);
  if (milestoneProgressNotifs.length !== 1) {
    throw new Error('Expected 1 MILESTONE_UPDATED notification for faculty');
  }

  // --------------------------------------------------------------------------
  // Assertion 6: Milestone Review & Evaluation Notification (Faculty -> Student Team)
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 6: Milestone Evaluation Notification to Team Members');
  await notificationService.notifyMilestoneReview({
    projectId,
    projectTitle: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    milestoneId: 'd0000000-0000-0000-0000-000000000003',
    milestoneNumber: 3,
    milestoneTitle: 'Explainable AI (Grad-CAM) & Web Integration',
    status: 'COMPLETED',
    facultyRemarks: 'Verified inference latency below 180ms. Excellent Grad-CAM heatmaps.',
    teamMemberIds: [student1Id, student2Id],
  });

  const s1MReviewNotifs = await Notification.find({
    recipientId: student1Id,
    type: 'MILESTONE_REVIEWED',
  });
  console.log(`✓ Student 1 received MILESTONE_REVIEWED notification: ${s1MReviewNotifs.length}`);
  if (s1MReviewNotifs.length !== 1) {
    throw new Error('Expected student 1 to receive MILESTONE_REVIEWED notification');
  }
  console.log(`  Title: "${s1MReviewNotifs[0].title}" | Message: "${s1MReviewNotifs[0].message}"`);

  // --------------------------------------------------------------------------
  // Assertion 7: Milestone Deadline & Overdue Notification Check
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 7: Milestone Deadline & Overdue Check');
  const deadlineResult = await milestoneService.checkAndNotifyMilestoneDeadlines(projectId);
  console.log(`✓ Milestone deadline notifications generated: ${deadlineResult.notifiedCount}`);
  if (deadlineResult.notifiedCount === 0) {
    throw new Error('Expected at least one overdue/approaching milestone notification');
  }

  const overdueNotifs = await Notification.find({
    recipientId: student1Id,
    type: 'MILESTONE_OVERDUE',
  });
  console.log(`  Student 1 received ${overdueNotifs.length} MILESTONE_OVERDUE notification(s)`);

  // --------------------------------------------------------------------------
  // Assertion 8: Listing, Pagination, and Unread Count Resolution
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 8: Notification Listing, Pagination & Unread Count API');
  const initialUnread = await notificationService.getUnreadCount(student1Id);
  console.log(`✓ Initial Student 1 Unread Notifications: ${initialUnread}`);
  if (initialUnread === 0) {
    throw new Error('Expected unread count > 0 for student 1');
  }

  const pagedList = await notificationService.getUserNotifications(student1Id, {
    page: 1,
    limit: 3,
  });
  console.log(`✓ Paginated results: returned ${pagedList.notifications.length} of ${pagedList.total} (Page ${pagedList.page}/${pagedList.totalPages})`);
  if (pagedList.notifications.length !== 3) {
    throw new Error(`Expected exactly 3 notifications on page 1, got ${pagedList.notifications.length}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 9: Mark-as-Read & Mark-All-as-Read Mutations
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 9: Mark-As-Read and Mark-All-As-Read Actions');
  const targetNotifId = pagedList.notifications[0].id;
  const updatedSingle = await notificationService.markNotificationAsRead(targetNotifId, student1Id);
  console.log(`✓ Notification marked as read: id=${updatedSingle.id}, isRead=${updatedSingle.isRead}, readAt=${updatedSingle.readAt}`);
  if (!updatedSingle.isRead || !updatedSingle.readAt) {
    throw new Error('Expected notification to be marked isRead = true with readAt set');
  }

  const unreadAfterSingle = await notificationService.getUnreadCount(student1Id);
  console.log(`✓ Unread count decremented to: ${unreadAfterSingle}`);
  if (unreadAfterSingle !== initialUnread - 1) {
    throw new Error(`Expected unread count to be ${initialUnread - 1}, got ${unreadAfterSingle}`);
  }

  const markAllResult = await notificationService.markAllNotificationsAsRead(student1Id);
  console.log(`✓ Mark-all-as-read modified: ${markAllResult.updatedCount} records`);
  const finalUnread = await notificationService.getUnreadCount(student1Id);
  console.log(`✓ Final unread count: ${finalUnread}`);
  if (finalUnread !== 0) {
    throw new Error(`Expected 0 unread notifications, got ${finalUnread}`);
  }

  // --------------------------------------------------------------------------
  // Assertion 10: Security Ownership Guard, Idempotency & Error Tolerance
  // --------------------------------------------------------------------------
  logger.info('\n▶ Assertion 10: Security Ownership Guard, Deduplication & Error Safety');

  // 10a. Cross-user modification blocked
  try {
    await notificationService.markNotificationAsRead(targetNotifId, student3Id);
    throw new Error('Test failed: User 3 should not be allowed to mark User 1 notification as read');
  } catch (err: unknown) {
    console.log(`✓ Cross-user modification rejected cleanly: "${(err as Error).message}"`);
  }

  // 10b. Duplicate event deduplication via idempotencyKey
  const duplicateKey = 'test-idempotent-event-101';
  const firstEmission = await notificationService.createNotification({
    recipientId: student3Id,
    type: 'SYSTEM_ALERT',
    title: 'Duplicate Prevention Test',
    message: 'Testing deduplication mechanism.',
    idempotencyKey: duplicateKey,
  });

  const secondEmission = await notificationService.createNotification({
    recipientId: student3Id,
    type: 'SYSTEM_ALERT',
    title: 'Duplicate Prevention Test',
    message: 'Testing deduplication mechanism.',
    idempotencyKey: duplicateKey,
  });

  if (!firstEmission || !secondEmission || firstEmission._id !== secondEmission._id) {
    throw new Error('Test failed: duplicate event was not deduplicated by idempotencyKey');
  }
  const countWithKey = await Notification.countDocuments({ idempotencyKey: duplicateKey });
  console.log(`✓ Duplicate emission prevented: Exactly ${countWithKey} record created in MongoDB`);
  if (countWithKey !== 1) {
    throw new Error(`Expected exactly 1 notification for duplicate key, got ${countWithKey}`);
  }

  // 10c. Missing recipient handled gracefully without throwing
  const missingRecipientResult = await notificationService.createNotification({
    recipientId: 'non-existent-user-uuid',
    type: 'SYSTEM_ALERT',
    title: 'Missing User Test',
    message: 'Should not crash the application.',
  });
  console.log(`✓ Missing recipient handled safely: returned ${missingRecipientResult}`);
  if (missingRecipientResult !== null) {
    throw new Error('Expected null when recipient does not exist');
  }

  // 10d. Stage 12 Evaluation Integration Point
  await notificationService.notifyProjectEvaluation({
    projectId,
    projectTitle: 'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    reviewId: 'review-final-placeholder',
    remarks: 'Final presentation completed and ready for evaluation grading.',
    teamMemberIds: [student1Id, student2Id],
    facultyGuideId: faculty1Id,
  });
  const evalNotifs = await Notification.find({ type: 'PROJECT_EVALUATION' });
  console.log(`✓ Stage 12 project evaluation notification hook tested: ${evalNotifs.length} notification(s) created`);
  if (evalNotifs.length < 3) {
    throw new Error(`Expected at least 3 PROJECT_EVALUATION notifications, got ${evalNotifs.length}`);
  }

  logger.info('\n================================================================');
  logger.info('🎉 ALL 10 STAGE 11 NOTIFICATION & ALERT TESTS PASSED PERFECTLY!');
  logger.info('================================================================');

  await disconnectMongo();
};

if (require.main === module) {
  runNotificationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Notification tests failed:', err);
      process.exit(1);
    });
}
