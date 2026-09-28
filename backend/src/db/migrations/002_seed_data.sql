-- ============================================================================
-- Student Project Lifecycle Management Platform (SPLM)
-- Migration 002: Realistic Academic Seed Data
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SEED SYSTEM SETTINGS
-- ----------------------------------------------------------------------------
INSERT INTO system_settings (key, value, description) VALUES
('MAX_TEAM_SIZE', '4', 'Maximum allowed student members per project team'),
('MIN_TEAM_SIZE', '1', 'Minimum student members required for project proposal'),
('REVIEW_WEIGHT_TECH', '40', 'Technical progress score percentage weight in periodic reviews'),
('REVIEW_WEIGHT_DOCS', '30', 'Documentation score percentage weight in periodic reviews'),
('REVIEW_WEIGHT_PRES', '30', 'Presentation/Viva score percentage weight in periodic reviews'),
('ALLOW_STUDENT_PROPOSALS', 'true', 'System-wide flag enabling new student proposal submissions');

-- ----------------------------------------------------------------------------
-- 2. SEED DEPARTMENTS
-- ----------------------------------------------------------------------------
INSERT INTO departments (id, code, name) VALUES
(1, 'AIDS', 'Department of Artificial Intelligence & Data Science'),
(2, 'CSE', 'Department of Computer Science & Engineering'),
(3, 'ECE', 'Department of Electronics & Communication Engineering');

-- ----------------------------------------------------------------------------
-- 3. SEED ACADEMIC BATCHES
-- ----------------------------------------------------------------------------
INSERT INTO academic_batches (id, department_id, name, start_year, end_year, is_active) VALUES
(1, 1, '2022-2026 Batch', 2022, 2026, TRUE),
(2, 1, '2023-2027 Batch', 2023, 2027, TRUE);

-- ----------------------------------------------------------------------------
-- 4. SEED USERS (Valid Hex UUIDs: [0-9a-f])
-- Standard password hash for 'Password@123' (bcrypt 10 rounds)
-- ----------------------------------------------------------------------------
-- Admin (a0000000...)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id) VALUES
('a0000000-0000-0000-0000-000000000001', 'admin@splm.edu', '$2a$10$w4RsmJmK6Pq67r1004hQ9e8.jU.X7Fm/75qgU28J16rV4v9p9sS.C', 'Dr. Aruna', 'Devi', 'ADMIN', 1);

-- Faculty (f0000000...)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id) VALUES
('f0000000-0000-0000-0000-000000000001', 'faculty1@splm.edu', '$2a$10$w4RsmJmK6Pq67r1004hQ9e8.jU.X7Fm/75qgU28J16rV4v9p9sS.C', 'Dr. Rajesh', 'Kumar', 'FACULTY', 1),
('f0000000-0000-0000-0000-000000000002', 'faculty2@splm.edu', '$2a$10$w4RsmJmK6Pq67r1004hQ9e8.jU.X7Fm/75qgU28J16rV4v9p9sS.C', 'Dr. Meenakshi', 'Sundaram', 'FACULTY', 1);

-- Students (b0000000...)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, department_id) VALUES
('b0000000-0000-0000-0000-000000000001', 'student1@splm.edu', '$2a$10$w4RsmJmK6Pq67r1004hQ9e8.jU.X7Fm/75qgU28J16rV4v9p9sS.C', 'Rahul', 'Sharma', 'STUDENT', 1),
('b0000000-0000-0000-0000-000000000002', 'student2@splm.edu', '$2a$10$w4RsmJmK6Pq67r1004hQ9e8.jU.X7Fm/75qgU28J16rV4v9p9sS.C', 'Ananya', 'Verma', 'STUDENT', 1),
('b0000000-0000-0000-0000-000000000003', 'student3@splm.edu', '$2a$10$w4RsmJmK6Pq67r1004hQ9e8.jU.X7Fm/75qgU28J16rV4v9p9sS.C', 'Vikram', 'Patel', 'STUDENT', 1),
('b0000000-0000-0000-0000-000000000004', 'student4@splm.edu', '$2a$10$w4RsmJmK6Pq67r1004hQ9e8.jU.X7Fm/75qgU28J16rV4v9p9sS.C', 'Sneha', 'Iyer', 'STUDENT', 1);

-- ----------------------------------------------------------------------------
-- 5. SEED FACULTY DETAILS
-- ----------------------------------------------------------------------------
INSERT INTO faculty (user_id, employee_id, designation, specialization, max_projects) VALUES
('f0000000-0000-0000-0000-000000000001', 'FAC-AI-101', 'Associate Professor', 'Computer Vision, Medical Image Analysis, Deep Learning', 5),
('f0000000-0000-0000-0000-000000000002', 'FAC-AI-102', 'Professor & Head', 'Natural Language Processing, Federated Learning, Edge AI', 6);

-- ----------------------------------------------------------------------------
-- 6. SEED STUDENT DETAILS
-- ----------------------------------------------------------------------------
INSERT INTO students (user_id, batch_id, roll_number, semester, cgpa) VALUES
('b0000000-0000-0000-0000-000000000001', 1, '22AD001', 6, 8.85),
('b0000000-0000-0000-0000-000000000002', 1, '22AD002', 6, 9.12),
('b0000000-0000-0000-0000-000000000003', 1, '22AD003', 6, 8.45),
('b0000000-0000-0000-0000-000000000004', 1, '22AD004', 6, 8.92);

-- ----------------------------------------------------------------------------
-- 7. SEED PROPOSALS (c0000000...)
-- ----------------------------------------------------------------------------
INSERT INTO proposals (id, title, abstract, domain, tech_stack, submitted_by, assigned_faculty_id, status, faculty_comments, version) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    'This project develops a high-precision multi-stage convolutional neural network coupled with Vision Transformers (ViT) to perform automated fundus retinal image classification and grading. The system generates pixel-level attention heatmaps via Grad-CAM to assist ophthalmologists with interpretable diagnostics.',
    'Artificial Intelligence & Healthcare',
    ARRAY['Python', 'PyTorch', 'Vision Transformer', 'FastAPI', 'React', 'Docker'],
    'b0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'APPROVED',
    'Comprehensive proposal with strong clinical relevance. Approved for 2025-2026 capstone.',
    2
),
(
    'c0000000-0000-0000-0000-000000000002',
    'Privacy-Preserving Federated Learning for Decentralized Health Records',
    'Investigating differential privacy mechanisms within asynchronous federated learning architectures across simulated edge hospital clusters. Ensures zero patient data leakage during global model gradient aggregations.',
    'Distributed Machine Learning & Cybersecurity',
    ARRAY['Python', 'TensorFlow Federated', 'PySyft', 'PostgreSQL', 'Docker'],
    'b0000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000002',
    'UNDER_REVIEW',
    'Initial review in progress. Exploring simulation hardware requirements.',
    1
);

-- ----------------------------------------------------------------------------
-- 8. SEED PROPOSAL MEMBERS
-- ----------------------------------------------------------------------------
INSERT INTO proposal_members (proposal_id, student_id, status) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ACCEPTED'),
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'ACCEPTED'),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'ACCEPTED'),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'INVITED');

-- ----------------------------------------------------------------------------
-- 9. SEED ACTIVE PROJECTS (e0000000...)
-- ----------------------------------------------------------------------------
INSERT INTO projects (id, proposal_id, title, abstract, domain, faculty_guide_id, status, overall_progress, repository_url) VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy',
    'This project develops a high-precision multi-stage convolutional neural network coupled with Vision Transformers (ViT) to perform automated fundus retinal image classification and grading. The system generates pixel-level attention heatmaps via Grad-CAM to assist ophthalmologists with interpretable diagnostics.',
    'Artificial Intelligence & Healthcare',
    'f0000000-0000-0000-0000-000000000001',
    'IN_PROGRESS',
    65,
    'https://github.com/splm-projects/retinopathy-ai'
);

-- ----------------------------------------------------------------------------
-- 10. SEED PROJECT MEMBERS
-- ----------------------------------------------------------------------------
INSERT INTO project_members (project_id, student_id, role_in_project) VALUES
('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'LEAD'),
('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'MEMBER');

-- ----------------------------------------------------------------------------
-- 11. SEED MILESTONES (d0000000...)
-- ----------------------------------------------------------------------------
INSERT INTO milestones (id, project_id, milestone_number, title, description, start_date, due_date, completion_percentage, status, student_remarks, faculty_remarks, completed_at) VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    1,
    'Requirement Analysis & Clinical Dataset Acquisition',
    'Acquire EyePACS and Messidor-2 clinical datasets, establish preprocessing pipeline and data governance protocols.',
    '2026-01-10', '2026-02-15',
    100, 'COMPLETED',
    '88,702 retinal fundus images downloaded, sanitized, and labeled with clinical annotations.',
    'Verified. Dataset ethical clearance and clinical metadata validated.',
    '2026-02-14 11:30:00+00'
),
(
    'd0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    2,
    'Model Architecture & Baseline Transfer Learning',
    'Implement EfficientNet-B4 and ViT-Base encoders, perform stratified training and evaluate AUROC.',
    '2026-02-16', '2026-03-25',
    100, 'COMPLETED',
    'Transfer learning pipeline achieved 94.2% test AUC across 5 retinopathy stages.',
    'Excellent baseline performance. Ready for explainability module.',
    '2026-03-24 16:45:00+00'
),
(
    'd0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    3,
    'Explainable AI (Grad-CAM) & Web Integration',
    'Integrate Grad-CAM visual explanations and package inference pipeline within containerized FastAPI server.',
    '2026-03-26', '2026-05-10',
    60, 'IN_PROGRESS',
    'Grad-CAM heatmaps generating correctly; currently benchmarking Docker API response latency.',
    'Ensure inference latency remains below 1.5 seconds per fundus photograph.',
    NULL
),
(
    'd0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000001',
    4,
    'Clinical Validation & Cross-Testing',
    'Evaluate model robustness on external APTOS 2019 dataset to test domain shift.',
    '2026-05-11', '2026-06-15',
    0, 'PENDING',
    NULL, NULL, NULL
),
(
    'd0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000001',
    5,
    'Final Thesis & Viva Defense',
    'Compile final B.Tech capstone thesis, prepare institutional presentation deck and open-source release.',
    '2026-06-16', '2026-07-15',
    0, 'PENDING',
    NULL, NULL, NULL
);

-- ----------------------------------------------------------------------------
-- 12. SEED REVIEWS & THE IMMUTABLE FEEDBACK LOOP (fa000000...)
-- ----------------------------------------------------------------------------
-- Round 1: Formative review with changes requested (Feedback-only, no marks)
INSERT INTO reviews (
    id, project_id, faculty_id, review_title, round_number, review_date,
    general_feedback, strengths, issues_identified, required_changes,
    has_marks, technical_score, documentation_score, presentation_score, total_score, status
) VALUES (
    'fa000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'Periodic Review 1: Problem Formulation & Dataset Integrity',
    1,
    '2026-02-18',
    'The project topic is robust and clinically relevant. However, the validation split strategy suffers from severe class imbalance.',
    'Strong literature synthesis and rigorous legal ethics clearance on clinical retinal photography.',
    'Training and validation splits were randomly shuffled rather than stratified across the 5 proliferative stages.',
    '1. Re-stratify splits proportionally across grades 0-4. 2. Document class weights in SRS Section 3.2.',
    FALSE, NULL, NULL, NULL, NULL,
    'CHANGES_REQUESTED'
);

-- Student Resubmission in response to Review 1 (fb000000...)
INSERT INTO review_resubmissions (
    id, review_id, project_id, resubmitted_by, student_notes, resubmitted_at
) VALUES (
    'fb000000-0000-0000-0000-000000000001',
    'fa000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Dataset splits have been recalculated using stratified 5-fold cross validation. Class distribution graphs and updated SRS v2 uploaded for review.',
    '2026-02-22 14:10:00+00'
);

-- Round 2: Re-evaluation of resubmission (Approved + Marks awarded)
INSERT INTO reviews (
    id, project_id, faculty_id, review_title, round_number, review_date,
    general_feedback, strengths, issues_identified, required_changes,
    has_marks, technical_score, documentation_score, presentation_score, total_score, status
) VALUES (
    'fa000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'Periodic Review 1: Re-evaluation & Model Baseline',
    2,
    '2026-02-25',
    'All requested revisions have been impeccably implemented. Stratification is mathematically verified, and baseline test AUC reaches 94.2%.',
    'Flawless resolution of data stratification; clear presentation of confusion matrices.',
    'None at this stage.',
    'Proceed directly to Grad-CAM heatmap visualization and API containerization.',
    TRUE, 92.00, 88.00, 90.00, 90.20,
    'APPROVED'
);

-- ----------------------------------------------------------------------------
-- 13. SEED DOCUMENTS (da000000...)
-- ----------------------------------------------------------------------------
INSERT INTO documents (id, project_id, uploaded_by, document_type, file_name, file_path, file_size_bytes, mime_type, version) VALUES
(
    'da000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'SRS',
    'SRS_Diabetic_Retinopathy_v1.pdf',
    'uploads/projects/e001/SRS_v1.pdf',
    2411720,
    'application/pdf',
    1
),
(
    'da000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'ARCHITECTURE_DESIGN',
    'Architecture_Design_Specification.pdf',
    'uploads/projects/e001/Arch_Design.pdf',
    3849102,
    'application/pdf',
    1
),
(
    'da000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'SRS',
    'SRS_Diabetic_Retinopathy_v2_Stratified.pdf',
    'uploads/projects/e001/SRS_v2.pdf',
    2580194,
    'application/pdf',
    2
);

-- ----------------------------------------------------------------------------
-- 14. SEED NOTIFICATIONS (ea000000...)
-- ----------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, title, message, type, is_read, link) VALUES
(
    'ea000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Changes Requested on Review 1',
    'Dr. Rajesh Kumar requested revisions regarding dataset split stratification.',
    'CHANGES_REQUESTED',
    TRUE,
    '/student/projects/e0000000-0000-0000-0000-000000000001/reviews'
),
(
    'ea000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'Resubmission Received',
    'Rahul Sharma resubmitted deliverables in response to Review 1 changes.',
    'RESUBMISSION_RECEIVED',
    TRUE,
    '/faculty/projects/e0000000-0000-0000-0000-000000000001/reviews'
),
(
    'ea000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Review 1 Approved with Score 90.20',
    'Periodic Review 1 re-evaluation approved. Total Score: 90.20 / 100.',
    'REVIEW_PUBLISHED',
    FALSE,
    '/student/projects/e0000000-0000-0000-0000-000000000001/reviews'
);

-- ----------------------------------------------------------------------------
-- 15. SEED AUDIT LOGS
-- ----------------------------------------------------------------------------
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES
('b0000000-0000-0000-0000-000000000001', 'PROPOSAL_SUBMITTED', 'PROPOSAL', 'c0000000-0000-0000-0000-000000000001', '{"title": "Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy"}'),
('f0000000-0000-0000-0000-000000000001', 'PROPOSAL_APPROVED', 'PROPOSAL', 'c0000000-0000-0000-0000-000000000001', '{"assigned_guide": "Dr. Rajesh Kumar"}'),
('f0000000-0000-0000-0000-000000000001', 'REVIEW_CHANGES_REQUESTED', 'REVIEW', 'fa000000-0000-0000-0000-000000000001', '{"round": 1}'),
('b0000000-0000-0000-0000-000000000001', 'REVIEW_RESUBMITTED', 'REVIEW', 'fa000000-0000-0000-0000-000000000001', '{"notes": "Stratified splits updated"}'),
('f0000000-0000-0000-0000-000000000001', 'REVIEW_APPROVED', 'REVIEW', 'fa000000-0000-0000-0000-000000000002', '{"round": 2, "total_score": 90.20}');
