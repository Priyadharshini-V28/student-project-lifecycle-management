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

export interface TeamMemberDto {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  role: 'LEAD' | 'MEMBER';
}

export interface FacultyGuideDto {
  id: string;
  name: string;
  email: string;
  designation: string;
  departmentCode: string;
}

export interface ActiveProjectDto {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  status: string;
  overallProgress: number;
  repositoryUrl: string | null;
  roleInProject: 'LEAD' | 'MEMBER';
  createdAt: string;
  facultyGuide: FacultyGuideDto;
  teamMembers: TeamMemberDto[];
}

export interface MilestoneDto {
  id: string;
  milestoneNumber: number;
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  completionPercentage: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  isOverdue: boolean;
  studentRemarks: string | null;
  facultyRemarks: string | null;
  completedAt: string | null;
}

export interface LatestReviewDto {
  id: string;
  roundNumber: number;
  reviewTitle: string;
  reviewDate: string;
  status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  generalFeedback: string;
  strengths: string | null;
  issuesIdentified: string | null;
  requiredChanges: string | null;
  hasMarks: boolean;
  technicalScore: number | null;
  documentationScore: number | null;
  presentationScore: number | null;
  totalScore: number | null;
  reviewerName: string;
  hasPendingResubmission: boolean;
}

export interface ProposalDto {
  id: string;
  title: string;
  domain: string;
  status: string;
  version: number;
  academicYear: string;
  createdAt: string;
}

export interface StudentDashboardMetrics {
  hasActiveProject: boolean;
  projectStatus: string | null;
  overallProgress: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  milestoneProgressPercentage: number;
  overdueMilestonesCount: number;
  pendingReviewAction: boolean;
  proposalsCount: number;
}

export interface StudentDashboardData {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rollNumber: string;
    semester: number;
    cgpa: number;
    batchName: string;
    departmentCode: string;
    departmentName: string;
  };
  metrics: StudentDashboardMetrics;
  activeProject: ActiveProjectDto | null;
  milestones: MilestoneDto[];
  latestReview: LatestReviewDto | null;
  proposals: ProposalDto[];
}

export interface FacultyPendingReviewItem {
  projectId: string;
  projectTitle: string;
  domain: string;
  status: string;
  studentLead: string;
  rollNumber: string;
  activeMilestoneNumber: number | null;
  activeMilestoneTitle: string | null;
  milestoneDueDate: string | null;
}

export interface FacultyPendingResubmissionItem {
  resubmissionId: string;
  reviewId: string;
  projectId: string;
  projectTitle: string;
  studentLead: string;
  rollNumber: string;
  roundNumber: number;
  studentNotes: string;
  resubmittedAt: string;
  originalRequiredChanges: string | null;
}

export interface FacultyPendingProposalItem {
  proposalId: string;
  title: string;
  domain: string;
  submittedByName: string;
  submittedByRoll: string;
  status: string;
  version: number;
  academicYear: string;
  createdAt: string;
}

export interface FacultyAssignedProject {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  status: string;
  overallProgress: number;
  repositoryUrl: string | null;
  createdAt: string;
  studentLead: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
  };
  teamMembersCount: number;
  currentMilestone: {
    milestoneNumber: number;
    title: string;
    dueDate: string;
    status: string;
    completionPercentage: number;
    isOverdue: boolean;
  } | null;
  latestReview: {
    roundNumber: number;
    reviewDate: string;
    status: string;
    totalScore: number | null;
  } | null;
}

export interface FacultyDashboardMetrics {
  maxQuota: number;
  currentlyAssigned: number;
  remainingCapacity: number;
  capacityUtilizationPercentage: number;
  pendingReviewsCount: number;
  pendingResubmissionsCount: number;
  proposalsAwaitingReviewCount: number;
  evaluatedProjectsCount: number;
}

export interface FacultyDashboardData {
  faculty: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    designation: string;
    specialization: string;
    departmentCode: string;
    departmentName: string;
  };
  metrics: FacultyDashboardMetrics;
  actionQueues: {
    pendingReviews: FacultyPendingReviewItem[];
    pendingResubmissions: FacultyPendingResubmissionItem[];
    pendingProposals: FacultyPendingProposalItem[];
  };
  assignedProjects: FacultyAssignedProject[];
}



