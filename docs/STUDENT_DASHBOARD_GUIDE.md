# Stage 5: Student Dashboard Architecture & Engineering Guide

## 1. Domain Overview & Purpose

In the **Student Project Lifecycle Management Platform (SPLM)**, the Student Dashboard functions as the primary operational cockpit for undergraduate engineering students. It consolidates academic progress, milestone gates, supervisor feedback, action alerts, and proposal records into a unified, real-time interface.

In accordance with real-world engineering standards, the dashboard adheres to a **Zero-Hardcoding Policy**: every single KPI metric, timeline state, and feedback indicator is dynamically computed via indexed relational queries in PostgreSQL.

```
                              ┌────────────────────────────────────────┐
                              │    HTTP GET /api/students/dashboard    │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                                ┌────────────────────────────────────┐
                                │   authenticate & requireRole       │
                                └─────────────────┬──────────────────┘
                                                  │
                                                  ▼
                                ┌────────────────────────────────────┐
                                │     studentService.getDashboard    │
                                └─────────────────┬──────────────────┘
                                                  │
         ┌───────────────────┬────────────────────┼───────────────────┬────────────────────┐
         │                   │                    │                   │                    │
         ▼                   ▼                    ▼                   ▼                    ▼
┌─────────────────┐ ┌─────────────────┐  ┌─────────────────┐ ┌─────────────────┐  ┌─────────────────┐
│ 1. Demographics │ │ 2. Active Proj  │  │ 3. Team Roster  │ │ 4. Milestones   │  │ 5. Review Loop  │
│ users, students,│ │ projects, guide │  │ project_members │ │ chronological   │  │ latest review,  │
│ batches, depts  │ │ status, progress│  │ lead & members  │ │ isOverdue calc  │  │ pending resub?  │
└─────────────────┘ └─────────────────┘  └─────────────────┘ └─────────────────┘  └─────────────────┘
```

---

## 2. Aggregation Architecture & Data Flow

### 2.1 Multi-Table Relational Queries
The dashboard aggregation service (`backend/src/services/student.service.ts`) executes a series of optimized, indexed queries:

1. **Student Demographics & Standing**:
   ```sql
   SELECT u.id, u.first_name, u.last_name, u.email, s.roll_number, s.semester, s.cgpa, b.name AS batchName, d.code AS departmentCode
   FROM users u
   JOIN students s ON u.id = s.user_id
   LEFT JOIN academic_batches b ON s.batch_id = b.id
   LEFT JOIN departments d ON u.department_id = d.id
   WHERE u.id = $1 AND u.role = 'STUDENT';
   ```

2. **Active Project Prioritization**:
   Orders active projects by lifecycle state priority (`IN_PROGRESS`, `UNDER_REVIEW`, `CHANGES_REQUESTED` before `ALLOCATED` and `COMPLETED`):
   ```sql
   SELECT p.id, p.title, p.abstract, p.domain, p.status, p.overall_progress, pm.role_in_project, ...
   FROM project_members pm
   JOIN projects p ON pm.project_id = p.id
   JOIN users u_guide ON p.faculty_guide_id = u_guide.id
   WHERE pm.student_id = $1
   ORDER BY 
     CASE 
       WHEN p.status IN ('IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED') THEN 1
       WHEN p.status = 'ALLOCATED' THEN 2
       ELSE 3
     END, p.created_at DESC
   LIMIT 1;
   ```

3. **Temporal Milestone Overdue Detection**:
   Evaluates deadline status on the database engine using `CURRENT_DATE`:
   ```sql
   SELECT m.id, m.milestone_number, m.title, m.due_date, m.completion_percentage, m.status,
          (m.status != 'COMPLETED' AND m.due_date < CURRENT_DATE) AS "isOverdue"
   FROM milestones m
   WHERE m.project_id = $1
   ORDER BY m.milestone_number ASC;
   ```

4. **Review Loop & Resubmission Detection**:
   Fetches the latest review and inspects whether `CHANGES_REQUESTED` has an outstanding resubmission:
   ```sql
   SELECT id FROM review_resubmissions WHERE review_id = $1 LIMIT 1;
   ```
   If no resubmission exists, `pendingReviewAction` is set to `true`, triggering high-priority alert banners on the frontend.

---

## 3. API Contract Reference

### `GET /api/students/dashboard`
- **Authentication**: Bearer Access Token (JWT)
- **Role Requirement**: `STUDENT`
- **Response Format**:
```json
{
  "success": true,
  "message": "Student dashboard aggregated data retrieved successfully",
  "data": {
    "student": {
      "id": "b0000000-0000-0000-0000-000000000001",
      "firstName": "Rahul",
      "lastName": "Sharma",
      "rollNumber": "22AD001",
      "semester": 6,
      "cgpa": 8.85,
      "departmentCode": "AIDS"
    },
    "metrics": {
      "hasActiveProject": true,
      "projectStatus": "IN_PROGRESS",
      "overallProgress": 65,
      "milestonesCompleted": 2,
      "milestonesTotal": 5,
      "milestoneProgressPercentage": 40,
      "overdueMilestonesCount": 3,
      "pendingReviewAction": false,
      "proposalsCount": 1
    },
    "activeProject": {
      "id": "e0000000-0000-0000-0000-000000000001",
      "title": "Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy",
      "domain": "Artificial Intelligence & Healthcare",
      "status": "IN_PROGRESS",
      "overallProgress": 65,
      "roleInProject": "LEAD",
      "facultyGuide": {
        "name": "Dr. Rajesh Kumar",
        "email": "faculty1@splm.edu",
        "designation": "Associate Professor"
      },
      "teamMembers": [
        { "name": "Rahul Sharma", "rollNumber": "22AD001", "role": "LEAD" },
        { "name": "Ananya Verma", "rollNumber": "22AD002", "role": "MEMBER" }
      ]
    },
    "milestones": [ ... ],
    "latestReview": {
      "roundNumber": 2,
      "status": "APPROVED",
      "hasMarks": true,
      "totalScore": 90.2,
      "generalFeedback": "All requested revisions have been impeccably implemented..."
    },
    "proposals": [ ... ]
  }
}
```

---

## 4. Frontend Component Hierarchy

The frontend implementation in `frontend/src/pages/StudentDashboard.tsx` is structured into cohesive visual sections:
1. **Header Bar**: Student identity badge with roll number, semester, profile link, and sign-out button.
2. **Hero Greeting / Alert Banner**:
   - Welcomes student with dynamic department affiliation.
   - Highlights changes requested banner when `pendingReviewAction` is active.
3. **4-Column KPI Metric Cards**:
   - `Project Lifecycle`: Status badge and overall progress.
   - `Milestone Gates`: Completed vs. total counter and progress bar.
   - `Deadlines`: Real-time overdue count or on-schedule badge.
   - `Academic Standing`: Current CGPA and semester.
4. **Active Project Spotlight Card**:
   - Problem statement / abstract snippet.
   - Supervisor details card.
   - Team member roster with role pills (`LEAD` vs `MEMBER`).
   - GitHub repository button.
5. **Milestone Tracking Schedule**:
   - Chronological breakdown from Milestone 1 to 5 with status badges and remarks.
6. **Latest Faculty Review & Feedback Card**:
   - Round number badge and evaluation decision.
   - Total score and score breakdown (Technical / 30, Docs / 30, Presentation / 40).
   - Structured qualitative boxes: Identified Strengths, Issues Identified, Required Changes.
7. **Proposals History Drawer**:
   - Historical submissions with status tags.

---

## 5. Automated Verification Results

Automated integration test suite: `backend/src/db/test_student_dashboard.ts` (`npm run test:student-dashboard`).

| Test # | Objective | Verified Result | Status |
| :--- | :--- | :--- | :--- |
| 1 | Student Demographics Retrieval | Rahul Sharma, 22AD001, Sem 6, CGPA 8.85, AIDS Dept | **PASS** |
| 2 | Active Project Spotlight | Diabetic Retinopathy, IN_PROGRESS, 65% progress, LEAD role | **PASS** |
| 3 | Team Membership Resolution | 2 members resolved (Rahul Sharma as LEAD, Ananya Verma as MEMBER) | **PASS** |
| 4 | Faculty Guide Resolution | Dr. Rajesh Kumar, faculty1@splm.edu, Associate Professor | **PASS** |
| 5 | Milestones Breakdown | 5 milestones total, 2 completed, 40% completion rate | **PASS** |
| 6 | Upcoming Milestone Tracking | Milestone 3 identified as active IN_PROGRESS gate (60% complete) | **PASS** |
| 7 | Latest Faculty Review | Round 2 APPROVED, Total Score: 90.2/100, feedback verified | **PASS** |
| 8 | Submitted Proposals | 1 proposal resolved (status: APPROVED, version: v2) | **PASS** |
| 9 | Service Layer Non-Student Rejection | Faculty user rejected with "Student record not found" | **PASS** |
| 10 | HTTP RBAC Middleware Guard | Mocked request rejected with 403 Forbidden | **PASS** |

---

## 6. Viva / Project Defense Checkpoint

**Q1: Why does the system query the database for dashboard KPIs instead of letting the frontend count them from raw data?**
> **Answer**: Centralizing metric aggregation on the backend ensures business logic consistency and security. The frontend cannot be trusted to calculate regulatory compliance numbers (such as overdue counts or whether revision actions are required). Additionally, backend aggregation minimizes network payload size and allows caching in Redis (Stage 14).

**Q2: What logic determines if a milestone is marked as `isOverdue`?**
> **Answer**: In SQL: `(m.status != 'COMPLETED' AND m.due_date < CURRENT_DATE)`. This ensures that even if a milestone is actively `IN_PROGRESS`, if the calendar date has surpassed the institutional due date, the system flags it as overdue, alerting both the student and the supervisor.

**Q3: How does the dashboard determine whether a student needs to take action on a review?**
> **Answer**: When `latestReview.status === 'CHANGES_REQUESTED'`, the system queries `review_resubmissions` for that specific review ID. If no resubmission has been logged yet, `hasPendingResubmission` is set to `true`, triggering an immediate action alert banner on the dashboard.
