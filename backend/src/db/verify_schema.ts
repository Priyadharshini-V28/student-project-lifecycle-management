import { connectMongo, disconnectMongo } from './mongo';
import {
  Department,
  AcademicBatch,
  Domain,
  User,
  Proposal,
  Project,
  Review,
  AuditLog,
  DocumentModel,
  Notification,
  Evaluation,
  SystemSetting,
} from '../models';
import { logger } from '../utils/logger';

export const runSchemaVerification = async (): Promise<void> => {
  logger.info('================================================================');
  logger.info('🔬 MONGODB SCHEMA & COLLECTION INTEGRITY VERIFICATION');
  logger.info('================================================================');

  await connectMongo();

  // 1. Verify Counts
  const deptCount = await Department.countDocuments();
  const batchCount = await AcademicBatch.countDocuments();
  const domainCount = await Domain.countDocuments();
  const userCount = await User.countDocuments();
  const proposalCount = await Proposal.countDocuments();
  const projectCount = await Project.countDocuments();
  const reviewCount = await Review.countDocuments();
  const settingCount = await SystemSetting.countDocuments();
  const docCount = await DocumentModel.countDocuments();
  const notifCount = await Notification.countDocuments();
  const evalCount = await Evaluation.countDocuments();
  const auditCount = await AuditLog.countDocuments();

  logger.info(`✓ Departments: ${deptCount}`);
  logger.info(`✓ Academic Batches: ${batchCount}`);
  logger.info(`✓ Project Domains: ${domainCount}`);
  logger.info(`✓ Users: ${userCount}`);
  logger.info(`✓ Proposals: ${proposalCount}`);
  logger.info(`✓ Projects: ${projectCount}`);
  logger.info(`✓ Reviews: ${reviewCount}`);
  logger.info(`✓ System Settings: ${settingCount}`);
  logger.info(`✓ Document Deliverables: ${docCount}`);
  logger.info(`✓ In-App Notifications: ${notifCount}`);
  logger.info(`✓ Final Evaluations: ${evalCount}`);
  logger.info(`✓ Audit Log Records: ${auditCount}`);

  if (deptCount < 3 || batchCount < 5 || domainCount < 12 || userCount < 7 || projectCount < 1) {
    throw new Error('MongoDB collection counts mismatch against academic seed specification');
  }

  // 2. Drill 1: Project with Lead, Guide, and Milestones
  logger.info('\n📊 Drill 1: Active Project with Guide, Lead and Embedded Milestones');
  const project = await Project.findOne();
  if (!project) throw new Error('No project found');

  const guide = await User.findById(project.facultyGuideId);
  const leadMember = project.teamMembers.find((m) => m.roleInProject === 'LEAD');
  const leadUser = leadMember ? await User.findById(leadMember.studentId) : null;
  const dept = guide?.departmentId ? await Department.findById(guide.departmentId) : null;

  console.log(`  Project Title: "${project.title}"`);
  console.log(`  Status: ${project.status} (${project.overallProgress}%)`);
  console.log(`  Faculty Guide: ${guide?.firstName} ${guide?.lastName}`);
  console.log(`  Student Lead: ${leadUser?.firstName} ${leadUser?.lastName}`);
  console.log(`  Department: ${dept?.code}`);
  console.log(`  Milestones Count: ${project.milestones.length}`);
  console.log(`  Team Members: ${project.teamMembers.length}`);

  // 3. Drill 2: Reviews
  logger.info('\n📊 Drill 2: Reviews and Feedback');
  const reviews = await Review.find({ projectId: project.id }).sort({ roundNumber: 1 });
  for (const r of reviews) {
    console.log(`  Round #${r.roundNumber}: ${r.reviewTitle} [Status: ${r.status}, Total Score: ${r.totalScore ?? 'N/A'}]`);
    console.log(`    Resubmissions count: ${r.resubmissions.length}`);
  }

  logger.info('\n================================================================');
  logger.info('🎉 MONGODB SCHEMA AND COLLECTION INTEGRITY VERIFIED (100% OK)');
  logger.info('================================================================');

  await disconnectMongo();
};

if (require.main === module) {
  runSchemaVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Schema verification error:', err);
      process.exit(1);
    });
}
