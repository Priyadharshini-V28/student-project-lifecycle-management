# Student Project Lifecycle Management Platform (SPLM)

A full-stack, enterprise-grade academic platform built to govern the entire project lifecycle for university students, faculty supervisors, and departmental administrators.

## 🎓 Academic Capstone Metadata
- **Domain**: Full-Stack Web Architecture, Educational Lifecycle Governance
- **Target Audience**: 3rd-Year B.Tech Artificial Intelligence & Data Science Students, Faculty Guides, Evaluation Committees
- **Core Workflow**: Student Project Formulation $\rightarrow$ Guide Appraisal $\rightarrow$ Allocation $\rightarrow$ Milestone Gates $\rightarrow$ Iterative Review & Feedback Resubmission Loop $\rightarrow$ Document Repository $\rightarrow$ Final Defense & Grading

---

## 🛠️ Technology Stack

| Layer | Technologies | Justification |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Axios, Lucide Icons | Component-driven reactivity, compile-time type safety, zero runtime type errors, rapid HMR bundling. |
| **Backend** | Node.js 20+, Express.js, TypeScript, Zod, Helmet, CORS | Layered architecture (Routes $\rightarrow$ Middleware $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Database), fail-fast env validation, secure headers. |
| **Database** | PostgreSQL 16 | Relational data integrity, foreign key cascades, check constraints, generated columns, ACID compliance. |
| **Cache & Sessions** | Redis 7+ | Authoritative active refresh-token store ($O(1)$ revocation), dashboard metrics aggregation caching with 5m TTL. |
| **DevOps** | Git, Docker, Docker Compose | Consistent multi-container orchestration (`frontend`, `backend`, `postgres`, `redis`). |

---

## 📁 Repository Structure

```
project-root/
│
├── backend/                  # Node.js + Express + TypeScript API service
│   ├── src/
│   │   ├── config/           # Zod-validated environment config
│   │   ├── controllers/      # HTTP request/response handlers
│   │   ├── middleware/       # Auth, error, and validation middleware
│   │   ├── routes/           # REST API route definitions
│   │   ├── services/         # Business logic and transactions
│   │   ├── utils/            # Custom ApiError and logger utilities
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # Server entry point & graceful shutdown
│   ├── .env.example          # Environment variable template
│   ├── package.json          # Backend dependencies
│   └── tsconfig.json         # Strict TypeScript configuration
│
├── frontend/                 # React 18 + Vite + TypeScript client
│   ├── src/
│   │   ├── services/         # Axios API client with interceptors
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Health check & dashboard entry
│   │   ├── index.css         # Tailwind directives
│   │   └── main.tsx          # React DOM entry point
│   ├── package.json          # Frontend dependencies
│   ├── tailwind.config.js    # Design system tokens
│   ├── tsconfig.json         # Client TypeScript configuration
│   └── vite.config.ts        # Vite dev server & API proxy
│
├── docs/                     # Architectural diagrams & specifications
│   └── SYSTEM_DESIGN.md      # Consolidated platform blueprint
│
├── .gitignore                # Git exclusion rules
└── README.md                 # Project documentation
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js**: v20+ or v24+
- **npm**: v10+

### 1. Backend Setup
```bash
cd backend
npm install
npm run build
npm run dev
# Server starts on http://localhost:5000
# Health check available at: http://localhost:5000/api/health
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Client runs on http://localhost:5173 (proxies /api to localhost:5000)
```

---

## 📊 Current Roadmap Status: Stage 1 Complete

- [x] **Stage 1: Project Foundation & Environment** (Node + Express + React + TS + Tailwind + Health API)
- [ ] **Stage 2: PostgreSQL Schema & Migrations** (17 normalized tables + seed script + SQL drills)
- [ ] **Stage 3: Authentication & Role-Based Authorization** (JWT + Redis session + Auth guards)
- [ ] **Stage 4: Student & Faculty Profiles**
- [ ] **Stage 5: Student Dashboard**
- [ ] **Stage 6: Faculty Dashboard**
- [ ] **Stage 7: Project & Proposal Management**
- [ ] **Stage 8: Faculty Guide Allocation**
- [ ] **Stage 9: Milestone Tracking**
- [ ] **Stage 10: Central Review & Resubmission Feedback Loop**
- [ ] **Stage 11: Document Management**
- [ ] **Stage 12: Notification System**
- [ ] **Stage 13: Final Evaluation**
- [ ] **Stage 14: Redis Integration**
- [ ] **Stage 15: Docker & Docker Compose**
- [ ] **Stage 16: Automated & Integration Testing**
- [ ] **Stage 17: Swagger API Documentation**
- [ ] **Stage 18: UI/UX Polish**
- [ ] **Stage 19: Deployment Readiness & Review Defense**
