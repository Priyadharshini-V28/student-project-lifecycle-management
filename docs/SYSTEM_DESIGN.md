# Student Project Lifecycle Management Platform — System Design & Specifications

## Academic Project Information
- **Domain**: Full-Stack Web Development, Educational ERP & Lifecycle Governance
- **Target Audience**: 3rd-Year B.Tech AI & Data Science Students, Faculty Supervisors, Institutional Academic Committees

## Core Philosophy: The Student–Faculty Lifecycle
The platform solves fragmentation in student project monitoring by enforcing a strict, auditable lifecycle:
`Student Proposal Formulation` $\rightarrow$ `Faculty Appraisal` $\rightarrow$ `Allocation & Team Formation` $\rightarrow$ `Milestone Execution` $\rightarrow$ `Iterative Review & Resubmission Loop` $\rightarrow$ `Document Repository` $\rightarrow$ `Final Evaluation & Grading`.

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios
- **Backend**: Node.js 20+, Express.js, TypeScript, Layered Modular Architecture (Routes $\rightarrow$ Middleware $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Database)
- **Database**: PostgreSQL 16 (Relational integrity, foreign key cascades, check constraints, generated columns)
- **Fast Storage / Cache**: Redis 7+ (Active refresh-token session store, dashboard aggregation caching, rate-limiting)
- **DevOps**: Docker & Docker Compose (Multi-container orchestration)
