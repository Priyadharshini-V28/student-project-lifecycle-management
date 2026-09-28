import fs from 'fs';
import path from 'path';
import { newDb } from 'pg-mem';
import { logger } from '../utils/logger';

export const runSchemaVerification = async (): Promise<void> => {
  logger.info('================================================================');
  logger.info('🔬 STAGE 2: POSTGRESQL SCHEMA VERIFICATION & SQL DRILL');
  logger.info('================================================================');

  // Initialize in-memory PostgreSQL engine
  const memDb = newDb();

  // Register pgcrypto and gen_random_uuid
  memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: (memDb.public as unknown as { getType: (t: string) => unknown }).getType('uuid') as never,
    implementation: () => '11111111-2222-3333-4444-555555555555',
  });

  const ddlPath = path.resolve(__dirname, 'migrations/001_create_tables.sql');
  const seedPath = path.resolve(__dirname, 'migrations/002_seed_data.sql');

  const ddlSql = fs.readFileSync(ddlPath, 'utf-8');
  const seedSql = fs.readFileSync(seedPath, 'utf-8');

  // 1. Execute DDL Schema Creation
  logger.info('⚡ Step 1: Validating DDL Schema (17 Tables & Constraints)...');
  // Strip non-standard extensions or specific commands if needed for pg-mem
  const sanitizedDdl = ddlSql.replace('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', '');
  memDb.public.none(sanitizedDdl);
  logger.info('✅ DDL executed successfully! All tables, primary keys, check constraints, and foreign keys valid.');

  // 2. Execute Seed Data Insertion
  logger.info('⚡ Step 2: Populating Realistic Seed Data...');
  // Execute seed SQL
  memDb.public.none(seedSql);
  logger.info('✅ Seed data inserted successfully!');

  // 3. Drill 1: Project with Lead, Guide, and Department Details (Multi-Table INNER JOIN)
  logger.info('\n📊 Drill 1: Active Project with Guide and Lead (Multi-Table INNER JOIN)');
  const projectDetails = memDb.public.many(`
    SELECT 
      p.title AS project_title,
      p.status AS project_status,
      p.overall_progress AS progress_pct,
      u_guide.first_name || ' ' || u_guide.last_name AS faculty_guide,
      u_lead.first_name || ' ' || u_lead.last_name AS student_lead,
      d.code AS department
    FROM projects p
    INNER JOIN users u_guide ON p.faculty_guide_id = u_guide.id
    INNER JOIN project_members pm ON p.id = pm.project_id AND pm.role_in_project = 'LEAD'
    INNER JOIN users u_lead ON pm.student_id = u_lead.id
    INNER JOIN departments d ON u_guide.department_id = d.id;
  `);
  console.table(projectDetails);

  // 4. Drill 2: Project Milestones & Completion Status (LEFT JOIN + ORDER BY)
  logger.info('\n📊 Drill 2: Project Milestones Breakdown (LEFT JOIN & ORDER BY)');
  const milestones = memDb.public.many(`
    SELECT 
      m.milestone_number AS "#",
      m.title,
      m.status,
      m.completion_percentage AS completed_pct,
      m.due_date,
      COALESCE(m.student_remarks, 'No remarks yet') AS remarks
    FROM milestones m
    ORDER BY m.milestone_number ASC;
  `);
  console.table(milestones);

  // 5. Drill 3: Multi-Round Review & Resubmission Feedback Loop (The Central Workflow)
  logger.info('\n📊 Drill 3: The Student-Faculty Review & Resubmission Loop (Multi-Round History)');
  const reviewLoop = memDb.public.many(`
    SELECT 
      r.review_title,
      r.round_number AS round,
      r.status AS review_status,
      r.general_feedback,
      r.required_changes,
      r.has_marks,
      COALESCE(r.total_score::text, 'Feedback Only') AS total_score,
      COALESCE(rs.student_notes, 'N/A') AS student_resubmission_response
    FROM reviews r
    LEFT JOIN review_resubmissions rs ON r.id = rs.review_id
    ORDER BY r.round_number ASC;
  `);
  console.table(reviewLoop);

  // 6. Drill 4: Faculty Supervision Workload Check (GROUP BY & Aggregations)
  logger.info('\n📊 Drill 4: Faculty Project Allocation & Quota Monitoring (GROUP BY & Aggregation)');
  const facultyWorkload = memDb.public.many(`
    SELECT 
      u.first_name || ' ' || u.last_name AS faculty_name,
      f.employee_id,
      f.max_projects AS max_quota,
      COUNT(p.id) AS assigned_projects_count
    FROM faculty f
    INNER JOIN users u ON f.user_id = u.id
    LEFT JOIN projects p ON f.user_id = p.faculty_guide_id
    GROUP BY u.first_name, u.last_name, f.employee_id, f.max_projects
    ORDER BY assigned_projects_count DESC;
  `);
  console.table(facultyWorkload);

  // 7. Drill 5: Finding Unallocated Students Using Subquery & NOT IN
  logger.info('\n📊 Drill 5: Students Without Active Project Allocation (Subquery & NOT IN)');
  const unallocatedStudents = memDb.public.many(`
    SELECT 
      s.roll_number,
      u.first_name || ' ' || u.last_name AS student_name,
      s.semester,
      s.cgpa
    FROM students s
    INNER JOIN users u ON s.user_id = u.id
    WHERE s.user_id NOT IN (
      SELECT student_id FROM project_members
    );
  `);
  console.table(unallocatedStudents);

  // 8. Drill 6: Real Student Dashboard Metrics Computation (Aggregation Query)
  logger.info('\n📊 Drill 6: Real Student Dashboard Metrics Computation (Aggregation Query)');
  const dashboardStats = memDb.public.many(`
    SELECT 
      COUNT(DISTINCT CASE WHEN p.status = 'IN_PROGRESS' THEN p.id END) AS active_projects,
      COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.id END) AS completed_projects,
      COUNT(DISTINCT CASE WHEN p.status = 'UNDER_REVIEW' THEN p.id END) AS awaiting_review,
      COUNT(DISTINCT CASE WHEN p.status = 'CHANGES_REQUESTED' THEN p.id END) AS changes_requested,
      COUNT(DISTINCT CASE WHEN m.status = 'OVERDUE' THEN m.id END) AS overdue_milestones,
      AVG(p.overall_progress) AS average_progress
    FROM project_members pm
    JOIN projects p ON pm.project_id = p.id
    LEFT JOIN milestones m ON p.id = m.project_id
    WHERE pm.student_id = 'b0000000-0000-0000-0000-000000000001';
  `);
  console.table(dashboardStats);

  logger.info('\n================================================================');
  logger.info('🎉 STAGE 2 VERIFICATION COMPLETE: ALL 6 DRILLS EXECUTED PERFECTLY!');
  logger.info('================================================================');
};

// Execute if run via CLI
if (require.main === module) {
  runSchemaVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Verification failed:', err);
      process.exit(1);
    });
}
