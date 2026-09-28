# Stage 6: Faculty Dashboard Architecture & Engineering Guide

## 1. Domain Overview & Purpose

In the **Student Project Lifecycle Management Platform (SPLM)**, the Faculty Dashboard functions as the primary operational cockpit for faculty project guides and evaluation panel members. Unlike the student perspective (which focuses on an individual project's progression), the faculty supervisor dashboard requires a **multi-tenant project portfolio view**, **workload quota monitoring**, and **action-oriented review queues**.

```
                              ┌────────────────────────────────────────┐
                              │    HTTP GET /api/faculty/dashboard     │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                                ┌────────────────────────────────────┐
                                │   authenticate & requireRole       │
                                │       (['FACULTY', 'ADMIN'])       │
                                └─────────────────┬──────────────────┘
                                                  │
                                                  ▼
                                ┌────────────────────────────────────┐
                                │     facultyService.getDashboard    │
                                └─────────────────┬──────────────────┘
                                                  │
         ┌───────────────────┬────────────────────┼───────────────────┬────────────────────┐
         │                   │                    │                   │                    │
         ▼                   ▼                    ▼                   ▼                    ▼
┌─────────────────┐ ┌─────────────────┐  ┌─────────────────┐ ┌─────────────────┐  ┌─────────────────┐
│ 1. Demographics │ │ 2. Quota & Cap  │  │ 3. Reviews Q    │ │ 4. Resubmit Q   │  │ 5. Proposals Q  │
│ designation,    │ │ max_projects vs │  │ projects in     │ │ anti-join on    │  │ assigned topics │
│ employee_id,    │ │ assigned projects│ │ 'UNDER_REVIEW'  │ │ review_resub    │  │ awaiting eval   │
│ specialization  │ │ remaining slots │  │ active milestone│ │ un-reviewed     │  │ version history │
└─────────────────┘ └─────────────────┘  └─────────────────┘ └─────────────────┘  └─────────────────┘
```

---

## 2. Key Architecture Decisions & Data Model

### 2.1 Supervisor Workload Quota Management
Faculty burnout and unequal capstone distribution represent major challenges in academic department administration. The dashboard models and tracks quota consumption in real time:
- **`maxQuota`**: Extracted from `faculty.max_projects` (configured institutionally or by department head).
- **`currentlyAssigned`**: Count of projects where `faculty_guide_id = facultyId` and `status IN ('ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW', 'CHANGES_REQUESTED')`.
- **`remainingCapacity`**: `Math.max(0, maxQuota - currentlyAssigned)`.
- **`capacityUtilizationPercentage`**: `Math.round((currentlyAssigned / maxQuota) * 100)`.

### 2.2 Action Queues Architecture
Faculty supervisors should not have to manually click through multiple project pages to discover what requires grading. The service automatically aggregates three distinct action queues:
1. **Pending Milestone Reviews Queue**:
   Projects where deliverables have been uploaded and the project lifecycle state has transitioned to `UNDER_REVIEW`.
2. **Pending Student Resubmissions Queue**:
   Student resubmissions created in response to a `CHANGES_REQUESTED` review. To prevent showing resubmissions that have already been evaluated, an anti-join pattern is utilized:
   ```sql
   SELECT rs.*, p.title, ...
   FROM review_resubmissions rs
   JOIN reviews r ON rs.review_id = r.id
   JOIN projects p ON rs.project_id = p.id
   LEFT JOIN reviews r_next ON r_next.project_id = rs.project_id AND r_next.round_number > r.round_number
   WHERE p.faculty_guide_id = $1
     AND r_next.id IS NULL
   ORDER BY rs.resubmitted_at DESC;
   ```
3. **Proposals Awaiting Appraisal Queue**:
   Student project proposals assigned to this faculty guide that are pending topic approval or revision evaluation:
   ```sql
   SELECT id, title, domain, ... FROM proposals
   WHERE assigned_faculty_id = $1 AND status IN ('SUBMITTED', 'UNDER_REVIEW')
   ORDER BY created_at DESC;
   ```

---

## 3. API Contract Reference

### `GET /api/faculty/dashboard`
- **Authentication**: Bearer Access Token (JWT)
- **Role Requirement**: `FACULTY`, `ADMIN`
- **Response Format**:
```json
{
  "success": true,
  "message": "Faculty dashboard aggregated data retrieved successfully",
  "data": {
    "faculty": {
      "id": "f0000000-0000-0000-0000-000000000001",
      "firstName": "Dr. Rajesh",
      "lastName": "Kumar",
      "employeeId": "FAC-AI-101",
      "designation": "Associate Professor",
      "specialization": "Computer Vision, Medical Image Analysis, Deep Learning",
      "departmentCode": "AIDS"
    },
    "metrics": {
      "maxQuota": 5,
      "currentlyAssigned": 1,
      "remainingCapacity": 4,
      "capacityUtilizationPercentage": 20,
      "pendingReviewsCount": 0,
      "pendingResubmissionsCount": 0,
      "proposalsAwaitingReviewCount": 0,
      "evaluatedProjectsCount": 0
    },
    "actionQueues": {
      "pendingReviews": [],
      "pendingResubmissions": [],
      "pendingProposals": []
    },
    "assignedProjects": [
      {
        "id": "e0000000-0000-0000-0000-000000000001",
        "title": "Autonomous Deep Learning Diagnostic System for Diabetic Retinopathy",
        "domain": "Artificial Intelligence & Healthcare",
        "status": "IN_PROGRESS",
        "overallProgress": 65,
        "studentLead": {
          "name": "Rahul Sharma",
          "rollNumber": "22AD001"
        },
        "teamMembersCount": 2,
        "currentMilestone": {
          "milestoneNumber": 3,
          "title": "Explainable AI (Grad-CAM) & Web Integration",
          "dueDate": "2026-05-10T00:00:00.000Z",
          "status": "IN_PROGRESS",
          "completionPercentage": 60,
          "isOverdue": true
        },
        "latestReview": {
          "roundNumber": 2,
          "status": "APPROVED",
          "totalScore": 90.2
        }
      }
    ]
  }
}
```

---

## 4. Frontend Component Hierarchy

The faculty dashboard interface lives in `frontend/src/pages/FacultyDashboard.tsx`:
1. **Header Bar**: Displays supervisor designation, employee ID, profile management button, and sign out.
2. **Hero & Quota Meter**:
   - Supervisor title, academic department, and research specialization.
   - Interactive capacity meter displaying currently assigned projects vs. maximum quota with remaining slot count.
3. **4-Column KPI Cards**:
   - `Supervised Projects`: Current active count and remaining capacity.
   - `Action Required`: Total pending reviews + resubmissions.
   - `Proposals to Review`: Awaiting topic appraisal.
   - `Evaluated & Completed`: Defended capstone projects.
4. **Supervisor Action Queue Drawer**:
   - Dynamic tabbed switcher: Reviews, Resubmissions, Proposals.
   - Quick action buttons ("Conduct Review", "Evaluate Resubmission", "Appraise Proposal").
5. **Supervised Projects Portfolio Roster**:
   - Project cards featuring domain badge, lifecycle status pill, student lead roll number, team size, active milestone due date, latest evaluation score, and repository link.

---

## 5. Automated Verification Results

Automated integration test suite: `backend/src/db/test_faculty_dashboard.ts` (`npm run test:faculty-dashboard`).

| Test # | Objective | Verified Result | Status |
| :--- | :--- | :--- | :--- |
| 1 | Retrieve Faculty Dashboard | Dr. Rajesh Kumar, FAC-AI-101, Associate Professor | **PASS** |
| 2 | Quota & Capacity Utilization | Max: 5, Assigned: 1, Remaining: 4 slots, 20% Utilization | **PASS** |
| 3 | Assigned Projects Portfolio | Diabetic Retinopathy, IN_PROGRESS, 65% progress, Lead: Rahul Sharma | **PASS** |
| 4 | Active Milestone Tracking | M3 Explainable AI (60% complete, Due: 2026-05-10) | **PASS** |
| 5 | Latest Review Record | Round #2 APPROVED, Score: 90.2/100 | **PASS** |
| 6 | Resubmission Filtering Anti-Join | Round 1 resubmission correctly suppressed (already re-evaluated in R2) | **PASS** |
| 7 | Faculty 2 Dashboard & Proposals | Dr. Meenakshi Sundaram (FAC-AI-102), 1 Proposal awaiting appraisal | **PASS** |
| 8 | Pending Review Queue Trigger | Simulated UNDER_REVIEW transition; queue correctly captured project | **PASS** |
| 9 | Service Layer Student Rejection | Student ID rejected with "Faculty record not found" | **PASS** |
| 10 | HTTP RBAC Middleware Guard | Mocked student HTTP request blocked with 403 Forbidden | **PASS** |

---

## 6. Viva / Project Defense Checkpoint

**Q1: How does the system prevent student resubmissions that have already been evaluated from lingering in the faculty action queue?**
> **Answer**: We use an anti-join pattern: `LEFT JOIN reviews r_next ON r_next.project_id = rs.project_id AND r_next.round_number > r.round_number WHERE r_next.id IS NULL`. If a subsequent review round has been created for that project, `r_next.id` is not null, automatically filtering the resubmission out of the queue.

**Q2: What is the benefit of computing capacity utilization dynamically instead of storing a counter in the database?**
> **Answer**: Storing a mutable counter invites denormalization anomalies and concurrency race conditions (e.g. guide reassignments or project cancellations failing to decrement the counter). Computing capacity on-the-fly (`max_projects - COUNT(active_projects)`) guarantees absolute consistency.

**Q3: How does the system restrict faculty members from viewing other faculty members' private grading queues?**
> **Answer**: The endpoint extracts the authenticated faculty ID directly from the validated Bearer JWT (`req.user.id`). All underlying database queries parameterize with `WHERE p.faculty_guide_id = $1` or `WHERE p.assigned_faculty_id = $1`, guaranteeing tenant isolation at the database layer.
