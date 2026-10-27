# Student Project Lifecycle Management Platform (SPLM)

A full-stack, enterprise-grade academic platform built to govern the entire capstone project lifecycle for university students, faculty supervisors, and departmental administrators.

## 🎓 Academic Capstone Metadata
- **Domain**: Full-Stack Web Architecture, Educational Lifecycle Governance
- **Target Audience**: 3rd-Year B.Tech Artificial Intelligence & Data Science Students, Faculty Guides, Evaluation Committees, Academic Administrators
- **Core Workflow**: Student Project Formulation $\rightarrow$ Guide Appraisal $\rightarrow$ Allocation & Capacity Enforcement $\rightarrow$ Milestone Gates $\rightarrow$ Deliverables & Immutable Version Control $\rightarrow$ In-App Event Notifications $\rightarrow$ Final Viva Defense, Rubric Evaluation & Degree Completion $\rightarrow$ Comprehensive Institutional Audit Trail

---

## 🛠️ Technology Stack

| Layer | Technologies | Architecture & Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Axios, Lucide Icons | Component-driven UI, institutional branding, strict TypeScript types, responsive role-based dashboards (Student, Faculty, Admin). |
| **Backend** | Node.js 20+, Express.js, TypeScript, Zod, Multer, Helmet, CORS | Layered architecture (`Routes` $\rightarrow$ `Middleware` $\rightarrow$ `Controllers` $\rightarrow$ `Services` $\rightarrow$ `Models`), fail-fast Zod validation, role-based access control. |
| **Primary Database** | MongoDB 7.0 + Mongoose 8+ ODM | Normalized and polymorphic document schemas, embedded milestone subdocuments, ACID multi-document transaction support where available, compound indexing. |
| **Authoritative Sessions** | Redis 7+ (with In-Memory Fallback) | Authoritative refresh token whitelist store for atomic token rotation and immediate single/multi-session revocation ($O(1)$). |
| **Storage & Security** | Local Volume File Storage, SHA-256 / UUID File Sanitization | Restricted document repository (`/uploads`), MIME type & size verification, authenticated role-guarded download streams. |
| **DevOps & Containerization** | Docker, Docker Compose, Nginx | Multi-stage production container builds (`builder` $\rightarrow$ `runner`), reverse proxy routing, persistent named volumes. |

---

## 📁 Repository Structure

```
student-project-management-system/
│
├── backend/                       # Node.js + Express + TypeScript API Service
│   ├── src/
│   │   ├── config/                # Environment configuration & Zod schemas
│   │   ├── controllers/           # HTTP controllers for all domain resources
│   │   ├── db/                    # MongoDB connection, seeds, and test suites
│   │   │   ├── mongo.ts           # Resilient connection & replica set handling
│   │   │   ├── seed_mongo.ts      # Academic demo seed data bootstrap
│   │   │   ├── verify_schema.ts   # Collection & schema integrity verifier
│   │   │   └── test_e2e_integration.ts # 10-module Stage 13 E2E test suite
│   │   ├── middleware/            # JWT authentication, RBAC, Multer upload, error handlers
│   │   ├── models/                # 12 Mongoose data models & TypeScript interfaces
│   │   ├── routes/                # REST API route definitions
│   │   ├── services/              # Business logic, audit logging, notifications
│   │   ├── utils/                 # Custom ApiError, logger, token generators
│   │   ├── validators/            # Zod validation schemas
│   │   ├── app.ts                 # Express application configuration
│   │   └── server.ts              # Server lifecycle & graceful shutdown
│   ├── Dockerfile                 # Multi-stage production Docker image
│   ├── .dockerignore              # Container build exclusions
│   ├── .env.example               # Backend environment variables template
│   ├── package.json               # Backend dependencies & test scripts
│   └── tsconfig.json              # Strict TypeScript compiler options
│
├── frontend/                      # React 18 + Vite + TypeScript Client
│   ├── src/
│   │   ├── components/            # Modals, forms, badges, document views, rubrics
│   │   ├── pages/                 # Role-specific dashboards (Student, Faculty, Admin), Login
│   │   ├── services/              # Axios API client with cookie handling
│   │   ├── types/                 # Domain types & API response contracts
│   │   ├── App.tsx                # Client routing & authentication guards
│   │   └── main.tsx               # Client entry point
│   ├── Dockerfile                 # Multi-stage Vite build + Nginx runtime
│   ├── nginx.conf                 # Nginx SPA fallback & /api reverse proxy
│   ├── .dockerignore              # Container build exclusions
│   ├── package.json               # Frontend dependencies
│   ├── tailwind.config.js         # Design system tokens
│   ├── tsconfig.json              # Strict TypeScript options
│   └── vite.config.ts             # Vite dev server & proxy settings
│
├── docker-compose.yml             # Full-stack Docker orchestration
├── .env.example                   # Complete root deployment configuration template
├── .gitignore                     # Git exclusion rules (zero committed secrets)
└── README.md                      # Platform documentation
```

---

## 🔑 Default Test & Seeded Accounts

The platform comes pre-seeded with realistic institutional accounts for end-to-end evaluation:

| Role | Name | Email | Password | Access & Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Dr. Aruna Swaminathan | `admin@splm.edu` | `SPLM@Admin2026` | Academic batches, project domains, supervisor capacity, department guide allocations. |
| **Faculty** | Dr. Rajesh Kumar | `faculty1@splm.edu` | `Password@123` | Proposal review, milestone sign-offs, deliverable reviews, final viva rubric scoring. |
| **Faculty** | Dr. Priya Sharma | `faculty2@splm.edu` | `Password@123` | Secondary supervisor, departmental project reviews, faculty capacity management. |
| **Student** | Rahul Sharma | `student1@splm.edu` | `Password@123` | Team Lead (22AD001), proposal drafting/resubmission, milestone updates, document uploads. |
| **Student** | Sneha Patel | `student2@splm.edu` | `Password@123` | Team Member (22AD002), milestone tracking, project deliverable access. |

*Note: Public self-registration is strictly restricted to Students and Faculty. Administrator accounts cannot be created via the public registration endpoint.*

---

## 🚀 Running the Platform

### Option A: Running with Docker Compose (Recommended for Production)

Prerequisites: Docker Engine 24+ and Docker Compose v2+.

1. **Clone the repository and copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Start the entire application stack:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify running containers:**
   ```bash
   docker compose ps
   ```
   - **Frontend**: `http://localhost:3000` (Served via Nginx)
   - **Backend API**: `http://localhost:5000/api`
   - **Health Check**: `http://localhost:5000/api/health`
   - **MongoDB**: `localhost:27017`
   - **Redis**: `localhost:6379`

4. **Tear down stack:**
   ```bash
   docker compose down
   ```

---

### Option B: Running Locally (Development Mode)

Prerequisites: Node.js 20+, npm 10+, MongoDB running on port 27017 (or will use in-memory fallback), Redis (optional, in-memory TTL fallback included).

1. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npm run seed        # Seeds initial academic dataset
   npm run dev         # Launches development server with live reload on http://localhost:5000
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev         # Starts Vite dev server on http://localhost:5173
   ```

3. **Open Browser:** Navigate to `http://localhost:5173` to test the application.

---

## 🧪 Comprehensive Verification & Test Suites

The backend includes 12 automated test suites covering every aspect of the project lifecycle:

```bash
cd backend

# 1. Run Complete Test Suite (All 12 suites sequentially)
npm run test:all

# 2. Run Stage 13 End-to-End Integration Test Suite
npm run test:e2e

# 3. Verify MongoDB Schema & Collection Integrity (12 collections)
npm run db:verify

# 4. Run Individual Module Suites
npm run test:auth               # Authentication, token rotation & session revocation
npm run test:profile            # Profile retrieval & academic metadata
npm run test:student-dashboard  # Student dashboard metrics & progress aggregation
npm run test:faculty-dashboard  # Faculty workload & capacity allocation
npm run test:proposals          # Proposal drafting, revisions & approval flow
npm run test:allocation         # Guide reassignments & capacity limits
npm run test:milestones         # Milestone scheduling, student updates & faculty sign-off
npm run test:documents          # Document upload, MIME validation & immutable versions
npm run test:notifications      # In-app event notifications & deduplication
npm run test:evaluation         # Viva prerequisites, rubric grading & completion
```

### Production Build Verification

```bash
# Verify Backend TypeScript Build
cd backend
npm run build     # Clean compilation via tsc (zero errors)

# Verify Frontend Production Bundle
cd frontend
npm run build     # Vite production bundling + gzip optimization (zero errors)
```

---

## 📋 Completed Stages (Full Lifecycle Architecture)

- [x] **Stage 1: Project Foundation & Environment** (Node + Express + React + TS + Tailwind + Health API)
- [x] **Stage 2: Database Schema & MongoDB Migration** (Mongoose ODM with polymorphic schemas, embedded subdocuments & transactions)
- [x] **Stage 3: Authentication & Role-Based Authorization** (JWT + Redis session + Auth guards)
- [x] **Stage 4: Student & Faculty Profiles** (Academic credentials, roll numbers, departments)
- [x] **Stage 5: Student Dashboard** (Project state tracking, deadlines, member rosters)
- [x] **Stage 6: Faculty Dashboard** (Supervision capacity, proposal queues, workload distribution)
- [x] **Stage 7: Project & Proposal Management** (Drafting, faculty revision loop, project spawning)
- [x] **Stage 8: Faculty Guide Allocation** (Workload quotas, admin reassignments, institutional balance)
- [x] **Stage 9: Milestone Tracking** (Progress percentages, deadline gating, faculty verification)
- [x] **Stage 10: Document Management** (MIME validation, immutable version history, secure downloads)
- [x] **Stage 11: Notifications & Alerts** (In-app real-time alerts, idempotent deduplication)
- [x] **Stage 12: Final Evaluation & Completion** (Rubric grading, viva defense, draft privacy, degree completion)
- [x] **Stage 13: Final Integration, System Verification & Deployment Readiness** (End-to-End verification, 12 test suites, Docker orchestration, production builds)
