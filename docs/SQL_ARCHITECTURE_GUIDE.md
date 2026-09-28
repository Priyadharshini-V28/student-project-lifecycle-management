# PostgreSQL Schema & Relational Database Architecture Guide

This comprehensive reference explains the relational database design, normalization analysis, constraints, and SQL queries used in the **Student Project Lifecycle Management Platform (SPLM)**.

---

## 1. Relational Database Concepts: Foundation

### 1.1 DBMS vs. RDBMS
- **DBMS (Database Management System)**: A general software system allowing storage, retrieval, and definition of data (e.g., file systems, document stores, key-value stores).
- **RDBMS (Relational Database Management System)**: A specialized DBMS based on Edgar F. Codd's relational model. Data is stored in 2D tables (relations) composed of rows (tuples) and columns (attributes). Crucially, relationships between tables are enforced via mathematical foreign keys, ensuring strict referential integrity.
- **Why PostgreSQL for SPLM?**: Academic project management requires non-negotiable integrity constraints. A project cannot exist without a proposal, a review cannot exist without an active project, and an evaluation cannot have duplicate grades. PostgreSQL guarantees full ACID compliance, foreign key cascades, and check constraints at the storage engine level.

### 1.2 Keys in Database Design
1. **Candidate Key**: A minimal set of attributes that uniquely identifies each record in a table. In our `users` table, both `id` (UUID) and `email` (string) are candidate keys.
2. **Primary Key (PK)**: The candidate key explicitly chosen by the database architect as the unique identifier for the table.
   - Example: `projects.id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
3. **Foreign Key (FK)**: An attribute in one table that references the primary key of another table, establishing a parent-child relationship.
   - Example: `milestones.project_id REFERENCES projects(id) ON DELETE CASCADE`
4. **Composite Key**: A primary key or unique constraint consisting of two or more columns.
   - Example: `project_members(project_id, student_id)` — ensures a student cannot be added twice to the same project.

---

## 2. Integrity Constraints & Referential Actions

| Constraint | Purpose | Example in SPLM Schema |
| :--- | :--- | :--- |
| `NOT NULL` | Prevents missing/null values in mandatory business fields. | `proposals.abstract TEXT NOT NULL` |
| `UNIQUE` | Guarantees that all values in the column or column pair are distinct. | `students.roll_number VARCHAR(50) UNIQUE` |
| `CHECK` | Enforces domain validation rules on column values. | `students.cgpa CHECK (cgpa >= 0.00 AND cgpa <= 10.00)` |
| `DEFAULT` | Assigns an automatic value when none is explicitly provided. | `users.created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP` |
| `ON DELETE CASCADE` | When parent row is deleted, all dependent child rows are deleted. | If a project is deleted, its `milestones`, `documents`, and `reviews` cascade-delete. |
| `ON DELETE RESTRICT` | Prevents deletion of parent row if child rows reference it. | A department cannot be deleted if active students/faculty belong to it. |

---

## 3. Database Normalization Proof (1NF, 2NF, 3NF)

Normalization is the systematic technique of organizing relational database tables to reduce data redundancy and eliminate update/insertion/deletion anomalies.

### 3.1 First Normal Form (1NF)
- **Rule**: Every attribute must contain only atomic (indivisible) values, and there must be no repeating groups.
- **SPLM Violation Avoided**: We do NOT store student team members as a comma-separated list of emails (`"student1@splm.edu, student2@splm.edu"`) inside the `projects` table. Nor do we have repeating columns like `milestone_1`, `milestone_2`, `milestone_3`.
- **Solution**: Dedicated tables `project_members` and `milestones` store each member and each milestone as an independent, atomic row.

### 3.2 Second Normal Form (2NF)
- **Rule**: Must be in 1NF, and all non-key attributes must be fully functionally dependent on the entire primary key (no partial dependencies on composite keys).
- **SPLM Violation Avoided**: In `project_members`, the composite primary/unique key is `(project_id, student_id)`. The only non-key attributes stored here are `role_in_project` ('LEAD' / 'MEMBER') and `joined_at`.
- **Proof**: If we had stored the student's name, roll number, or CGPA inside `project_members`, those attributes would depend only on `student_id`, not on the entire composite key `(project_id, student_id)`. By keeping student attributes in `students` and `users`, partial dependency is eliminated.

### 3.3 Third Normal Form (3NF)
- **Rule**: Must be in 2NF, and there must be no transitive dependencies (non-key attributes must not depend on other non-key attributes; \(X \rightarrow Y \rightarrow Z\)).
- **SPLM Violation Avoided**: In the `users` table, we store `department_id` referencing `departments(id)`. We do NOT store `department_name` or `department_code` inside `users`.
- **Proof**: If `users` stored `department_name`, then `user_id` $\rightarrow$ `department_id` $\rightarrow$ `department_name`. If a department changed its name, multiple user rows would require updates (update anomaly). By separating `departments` into its own table, transitive dependencies are completely eliminated.

---

## 4. Key SQL Query Archetypes Used in SPLM

### 4.1 Multi-Table `INNER JOIN` (Active Project with Guide and Lead)
Used to retrieve complete project cards for student and faculty views:
```sql
SELECT 
  p.id AS project_id,
  p.title AS project_title,
  p.status AS project_status,
  p.overall_progress,
  u_guide.first_name || ' ' || u_guide.last_name AS faculty_guide,
  u_lead.first_name || ' ' || u_lead.last_name AS student_lead,
  d.code AS department_code
FROM projects p
INNER JOIN users u_guide ON p.faculty_guide_id = u_guide.id
INNER JOIN project_members pm ON p.id = pm.project_id AND pm.role_in_project = 'LEAD'
INNER JOIN users u_lead ON pm.student_id = u_lead.id
INNER JOIN departments d ON u_guide.department_id = d.id
WHERE p.status = 'IN_PROGRESS';
```

### 4.2 Multi-Round Review & Resubmission History (`LEFT JOIN` & `ORDER BY`)
The core student-faculty feedback loop preserves every review round and its linked student resubmission response:
```sql
SELECT 
  r.review_title,
  r.round_number AS round,
  r.status AS review_status,
  r.general_feedback,
  r.required_changes,
  r.has_marks,
  r.total_score,
  COALESCE(rs.student_notes, 'Awaiting student resubmission') AS student_response
FROM reviews r
LEFT JOIN review_resubmissions rs ON r.id = rs.review_id
WHERE r.project_id = $1
ORDER BY r.round_number ASC;
```

### 4.3 Aggregation & Capacity Monitoring (`GROUP BY`)
Used by department admins and coordinators to prevent faculty guide over-allocation:
```sql
SELECT 
  u.first_name || ' ' || u.last_name AS faculty_name,
  f.employee_id,
  f.max_projects AS quota,
  COUNT(p.id) AS currently_assigned
FROM faculty f
INNER JOIN users u ON f.user_id = u.id
LEFT JOIN projects p ON f.user_id = p.faculty_guide_id AND p.status = 'IN_PROGRESS'
GROUP BY u.first_name, u.last_name, f.employee_id, f.max_projects
ORDER BY currently_assigned DESC;
```

### 4.4 Subqueries & Set Membership (`NOT IN` / `NOT EXISTS`)
Used to identify students who do not yet have an active project allocation:
```sql
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
```

### 4.5 ACID Transactions (`BEGIN`, `COMMIT`, `ROLLBACK`)
Crucial when an atomic workflow modifies multiple tables. For example, when a faculty guide **Approves a Proposal**:
1. Update `proposals.status = 'APPROVED'`.
2. Insert new record into `projects`.
3. Copy proposal members into `project_members`.
4. Generate 5 default project `milestones`.
5. Insert audit log into `audit_logs`.

If step 4 fails (e.g., date constraint violation), the database automatically issues `ROLLBACK`, leaving zero orphan records in the database.

---

## 5. Performance Indexing Strategy

In PostgreSQL, sequential table scans ($O(N)$) degrade performance as table sizes grow. B-Tree indexes ($O(\log N)$) are created on:
1. **Foreign Keys**: `milestones(project_id)`, `reviews(project_id)`, `documents(project_id)` — accelerating `JOIN` performance.
2. **High-Frequency Query Filters**: `users(email)`, `users(role)`, `proposals(status)`.
3. **Composite Index**: `milestones(project_id, status)` — optimizes queries like "fetch active/overdue milestones for Project X".
