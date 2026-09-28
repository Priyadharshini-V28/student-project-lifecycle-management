-- ============================================================================
-- Student Project Lifecycle Management Platform (SPLM)
-- Migration 001: Initial Relational Database Schema
-- Database: PostgreSQL 16
-- ============================================================================

-- Enable UUID extension if available (PostgreSQL 13+ includes gen_random_uuid() natively)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables in reverse dependency order for clean migrations
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS final_evaluations CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS review_resubmissions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS proposal_members CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS academic_batches CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- ----------------------------------------------------------------------------
-- 1. SYSTEM_SETTINGS
-- Configurable platform thresholds without hardcoding constants
-- ----------------------------------------------------------------------------
CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2. DEPARTMENTS
-- Academic departments (e.g. AI&DS, CSE, IT, ECE)
-- ----------------------------------------------------------------------------
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. ACADEMIC_BATCHES
-- Batches belonging to departments (e.g. 2022-2026 Batch)
-- ----------------------------------------------------------------------------
CREATE TABLE academic_batches (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    name VARCHAR(50) NOT NULL,
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dept_batch UNIQUE (department_id, name),
    CONSTRAINT chk_batch_years CHECK (end_year > start_year)
);

-- ----------------------------------------------------------------------------
-- 4. USERS
-- Central authentication identity table with Role-Based Access Control
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'FACULTY', 'ADMIN')),
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. STUDENTS
-- Extended profile attributes specific to enrolled students
-- ----------------------------------------------------------------------------
CREATE TABLE students (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES academic_batches(id) ON DELETE RESTRICT,
    roll_number VARCHAR(50) UNIQUE NOT NULL,
    semester INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
    cgpa NUMERIC(3, 2) CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 6. FACULTY
-- Extended profile attributes for supervisors, guides, and reviewers
-- ----------------------------------------------------------------------------
CREATE TABLE faculty (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    designation VARCHAR(100) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    max_projects INTEGER DEFAULT 5 CHECK (max_projects > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. PROPOSALS
-- Student project proposals formulating domain, abstract, and tech stack
-- ----------------------------------------------------------------------------
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    abstract TEXT NOT NULL,
    domain VARCHAR(100) NOT NULL,
    tech_stack TEXT[] NOT NULL,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_faculty_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'
    )),
    faculty_comments TEXT,
    version INTEGER DEFAULT 1,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2025-2026',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. PROPOSAL_MEMBERS
-- Prospective team members invited to a proposal prior to official approval
-- ----------------------------------------------------------------------------
CREATE TABLE proposal_members (
    id SERIAL PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ACCEPTED' CHECK (status IN ('INVITED', 'ACCEPTED', 'DECLINED')),
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_proposal_student UNIQUE (proposal_id, student_id)
);

-- ----------------------------------------------------------------------------
-- 9. PROJECTS
-- Official active projects instantiated upon proposal approval
-- ----------------------------------------------------------------------------
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID UNIQUE NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    abstract TEXT NOT NULL,
    domain VARCHAR(100) NOT NULL,
    faculty_guide_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(30) DEFAULT 'ALLOCATED' CHECK (status IN (
        'ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'EVALUATED', 'COMPLETED', 'SUSPENDED', 'ARCHIVED'
    )),
    overall_progress INTEGER DEFAULT 0 CHECK (overall_progress BETWEEN 0 AND 100),
    repository_url VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 10. PROJECT_MEMBERS
-- Formal project team membership linking enrolled students to active projects
-- ----------------------------------------------------------------------------
CREATE TABLE project_members (
    id SERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_in_project VARCHAR(20) DEFAULT 'MEMBER' CHECK (role_in_project IN ('LEAD', 'MEMBER')),
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_member UNIQUE (project_id, student_id)
);

-- ----------------------------------------------------------------------------
-- 11. MILESTONES
-- Chronological milestones and submission gates per project
-- ----------------------------------------------------------------------------
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE')),
    student_remarks TEXT,
    faculty_remarks TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_milestone_num UNIQUE (project_id, milestone_number),
    CONSTRAINT chk_milestone_dates CHECK (due_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- 12. REVIEWS
-- Periodic reviews supporting feedback-only and optional rubric scoring
-- ----------------------------------------------------------------------------
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    review_title VARCHAR(150) NOT NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    review_date DATE NOT NULL,
    general_feedback TEXT NOT NULL,
    strengths TEXT,
    issues_identified TEXT,
    required_changes TEXT,
    has_marks BOOLEAN DEFAULT FALSE,
    technical_score NUMERIC(5, 2) CHECK (technical_score IS NULL OR (technical_score >= 0 AND technical_score <= 100)),
    documentation_score NUMERIC(5, 2) CHECK (documentation_score IS NULL OR (documentation_score >= 0 AND documentation_score <= 100)),
    presentation_score NUMERIC(5, 2) CHECK (presentation_score IS NULL OR (presentation_score >= 0 AND presentation_score <= 100)),
    total_score NUMERIC(5, 2),
    status VARCHAR(30) NOT NULL CHECK (status IN ('CHANGES_REQUESTED', 'APPROVED', 'IN_PROGRESS')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_review_round UNIQUE (project_id, review_title, round_number)
);

-- ----------------------------------------------------------------------------
-- 13. REVIEW_RESUBMISSIONS
-- Immutable student responses linking to the review that requested changes
-- ----------------------------------------------------------------------------
CREATE TABLE review_resubmissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    resubmitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    student_notes TEXT NOT NULL,
    attached_document_ids UUID[],
    resubmitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 14. DOCUMENTS
-- Project deliverable asset metadata (SRS, Architecture, Code ZIP, Reports)
-- ----------------------------------------------------------------------------
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'PROPOSAL', 'SRS', 'ARCHITECTURE_DESIGN', 'MID_TERM_REPORT', 'FINAL_THESIS', 'PRESENTATION', 'SOURCE_CODE_ZIP'
    )),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    version INTEGER DEFAULT 1,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 15. FINAL_EVALUATIONS
-- Comprehensive final evaluation, viva marks, and official letter grade
-- ----------------------------------------------------------------------------
CREATE TABLE final_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    technical_score NUMERIC(5, 2) NOT NULL CHECK (technical_score BETWEEN 0 AND 100),
    documentation_score NUMERIC(5, 2) NOT NULL CHECK (documentation_score BETWEEN 0 AND 100),
    presentation_score NUMERIC(5, 2) NOT NULL CHECK (presentation_score BETWEEN 0 AND 100),
    viva_score NUMERIC(5, 2) NOT NULL CHECK (viva_score BETWEEN 0 AND 100),
    overall_score NUMERIC(5, 2) NOT NULL,
    letter_grade VARCHAR(5) NOT NULL CHECK (letter_grade IN ('O', 'A+', 'A', 'B+', 'B', 'RA')),
    final_remarks TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PUBLISHED' CHECK (status IN ('PENDING', 'PUBLISHED')),
    evaluated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 16. NOTIFICATIONS
-- In-app alerts triggered by domain events
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 17. AUDIT_LOGS
-- Immutable system audit trail for compliance and activity tracking
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- Optimized for frequent queries, foreign key lookups, and composite filters
-- ============================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id);

CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_submitted_by ON proposals(submitted_by);
CREATE INDEX idx_proposals_assigned_faculty ON proposals(assigned_faculty_id);

CREATE INDEX idx_projects_guide ON projects(faculty_guide_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_project_members_student ON project_members(student_id);

CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_milestones_status ON milestones(status);
CREATE INDEX idx_milestones_project_status ON milestones(project_id, status);

CREATE INDEX idx_reviews_project ON reviews(project_id);
CREATE INDEX idx_reviews_faculty ON reviews(faculty_id);
CREATE INDEX idx_review_resubmissions_review ON review_resubmissions(review_id);

CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);
