export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
  timestamp: string;
}

export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  departmentId?: number;
  departmentCode?: string;
  departmentName?: string;
  profile?: {
    rollNumber?: string;
    semester?: number;
    cgpa?: number;
    batchName?: string;
    employeeId?: string;
    designation?: string;
    specialization?: string;
  };
}

export interface HealthCheckData {
  uptimeSeconds: number;
  timestamp: string;
  environment: string;
  version: string;
}

export interface ProjectSummary {
  projectId: string;
  title: string;
  domain: string;
  status: string;
  progress: number;
  roleInProject?: string;
  facultyGuide?: string;
  studentLead?: string;
  allocatedAt?: string;
}

export interface StudentAcademicProfile extends User {
  activeProjectCount: number;
  projects: ProjectSummary[];
}

export interface FacultyAcademicProfile extends User {
  activeProjectCount: number;
  maxQuota: number;
  currentlyAssigned: number;
  remainingCapacity: number;
  pendingReviewsCount: number;
  assignedProjects: ProjectSummary[];
}

