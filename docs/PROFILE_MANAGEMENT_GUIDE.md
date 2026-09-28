# Stage 4: Student & Faculty Profiles Architecture & Engineering Guide

## 1. Domain Overview & Purpose

In an academic lifecycle governance portal, User Profile management is fundamentally distinct from typical consumer applications. Institutional identity data—such as **University Roll Numbers**, **Employee IDs**, **Department affiliations**, and **Academic Batches**—constitutes authoritative official records. Permitting unrestricted modification of these attributes would introduce academic fraud and regulatory non-compliance.

Stage 4 establishes a strict, role-aware profile management subsystem for the **Student Project Lifecycle Management Platform (SPLM)**.

```
                           ┌────────────────────────────────────────┐
                           │      JWT Authenticated Request         │
                           └──────────────────┬─────────────────────┘
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │       Role Guard & RBAC         │
                             └────────┬───────────────┬────────┘
                                      │               │
                     ┌────────────────┴────┐     ┌────┴────────────────┐
                     │   STUDENT Role      │     │    FACULTY Role     │
                     └────────┬────────────┘     └────┬────────────────┘
                              │                       │
           ┌──────────────────┴─────────────┐         │
           │  • Permitted: Name, Semester,  │         │  • Permitted: Name, Designation,
           │    CGPA (0.00 - 10.00)         │         │    Specialization / Domains
           │  • Read-only: Roll No, Batch,  │         │  • Read-only: Employee ID, Quota
           │    Active Enrolled Projects    │         │  • Computed: Remaining Capacity
           └────────────────────────────────┘         └────────────────────────────────┘
```

---

## 2. Architectural Decisions & Security Principles

### 2.1 Separation of Mutable vs Immutable Attributes
- **Immutable Institutional Attributes**:
  - `roll_number`, `employee_id`, `department_id`, `email`, and `role`.
  - These attributes can only be provisioned or altered via Administrative actions (`ADMIN` role or automated institutional SIS sync).
- **Mutable Student Attributes**:
  - `first_name`, `last_name`, `semester` (enforced between 1 and 8), `cgpa` (enforced between 0.00 and 10.00).
- **Mutable Faculty Attributes**:
  - `first_name`, `last_name`, `designation` (e.g. Associate Professor), `specialization` (research domains).

### 2.2 Relational Transactional Updates
A profile update often spans both the primary `users` table and the role-specific extension table (`students` or `faculty`). In `user.service.ts`, updates are wrapped in an atomic PostgreSQL transaction:
```typescript
await transaction(async (client) => {
  if (input.firstName || input.lastName) {
    await client.query('UPDATE users SET ... WHERE id = $1', ...);
  }
  if (role === 'STUDENT' && (input.semester || input.cgpa)) {
    await client.query('UPDATE students SET ... WHERE user_id = $1', ...);
  }
  if (role === 'FACULTY' && (input.designation || input.specialization)) {
    await client.query('UPDATE faculty SET ... WHERE user_id = $1', ...);
  }
});
```

### 2.3 Secure Password Rotation & Audit Trail
Changing an account password follows strict defensive controls:
1. **Verification of Current Credential**: Compares provided current password against stored bcrypt hash (`bcrypt.compare`).
2. **Strength Enforcement**: Validated via Zod (`min(8)`, uppercase letter regex, numeric digit regex, and inequality check against current password).
3. **Re-Hashing**: Salt generation (`bcrypt.genSalt(10)`) and one-way hashing (`bcrypt.hash`).
4. **Audit Logging**: Inserts an immutable event record into `audit_logs` (`action = 'PASSWORD_CHANGED', entity_type = 'USER'`).

---

## 3. API Contract Reference

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users/profile` | `STUDENT`, `FACULTY`, `ADMIN` | Fetches caller's unified profile with department & active project count |
| `PUT` | `/api/users/profile` | `STUDENT`, `FACULTY`, `ADMIN` | Updates role-permitted profile fields within transaction |
| `POST` | `/api/users/change-password` | `STUDENT`, `FACULTY`, `ADMIN` | Verifies current password, sets new hash, logs audit entry |
| `GET` | `/api/users/student-profile` | `STUDENT` | Specialized view: academic standing + enrolled projects with guide & progress |
| `GET` | `/api/users/faculty-profile` | `FACULTY`, `ADMIN` | Specialized view: quota capacity ($MaxQuota - Assigned$) + pending reviews |

---

## 4. Frontend Component Architecture

The frontend implementation lives in `frontend/src/pages/ProfilePage.tsx` and features:
- **Tabbed Interface**:
  - `Academic Overview`: Displays official institutional credentials, degree standing, and linked projects.
  - `Edit Profile`: Role-aware form enabling students to adjust semester/CGPA and faculty to update research interests.
  - `Security & Credentials`: Password rotation form featuring dynamic requirement checklist and password visibility toggle.
- **Global Context Synchronization**:
  - Leverages `updateUserState(updatedUser)` in `AuthContext` to update navigation headers and dashboard greetings across the application without requiring a page reload.

---

## 5. Automated Verification Summary

Automated integration test suite: `backend/src/db/test_profile.ts` (`npm run test:profile`).

| Test # | Objective | Verified Result | Status |
| :--- | :--- | :--- | :--- |
| 1 | Retrieve Student Profile | Roll `22AD001`, Sem 6, CGPA 8.85, Dept `AIDS` | **PASS** |
| 2 | Retrieve Faculty Profile | ID `FAC-AI-101`, Associate Professor, 1 Project | **PASS** |
| 3 | Update Student Profile | Sem updated to 7, CGPA updated to 9.15 and reverted | **PASS** |
| 4 | Update Faculty Profile | Designation & specialization updated and reverted | **PASS** |
| 5 | Validation Enforcement | Out-of-range CGPA (11.5) & Sem (10) rejected by Zod | **PASS** |
| 6 | Incorrect Password Change | Rejected with 400 Bad Request ("Current password is incorrect") | **PASS** |
| 7 | Valid Password Rotation | Password updated, authenticated with new pass, audit log verified | **PASS** |
| 8 | Student Academic Profile | Returned Diabetic Retinopathy project (65% progress, LEAD role) | **PASS** |
| 9 | Faculty Academic Profile | Returned Max Quota (5), Assigned (1), Remaining (4) | **PASS** |
| 10 | RBAC Boundary Isolation | Cross-role profile access blocked with 403 Forbidden | **PASS** |

---

## 6. Viva / Project Defense Checkpoint

**Q1: Why are roll numbers and employee IDs excluded from the update endpoint?**
> **Answer**: In university project governance, roll numbers and employee IDs are primary institutional identifiers mapped directly to university registrar records. Allowing users to alter their own institutional identifiers could lead to impersonation, academic fraud, or grade misattribution.

**Q2: What prevents race conditions when updating student details and user details simultaneously?**
> **Answer**: We utilize database transactions (`transaction(async (client) => ...)`). If the update to the `students` table fails (e.g., due to a constraint check violation), the update to `users` is automatically rolled back, preserving database integrity.

**Q3: How does the system ensure that a faculty member does not take on more projects than institutionally permitted?**
> **Answer**: The faculty academic profile calculates `remainingCapacity = maxQuota - currentlyAssigned`. In Stage 7 (Project Allocation), the backend enforces this check before any project guide assignment can be finalized.
