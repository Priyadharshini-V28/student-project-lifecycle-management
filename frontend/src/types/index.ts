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
  subjectCode?: string;
  subjectName?: string;
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
  allProjects?: Array<{
    id: string;
    title: string;
    domain: string;
    status: string;
    subjectCode: string;
    subjectName: string;
    overallProgress: number;
    roleInProject: string;
  }>;
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

export interface SystemSettingsDto {
  maxTeamSize: number;
  minTeamSize: number;
  allowStudentProposals: boolean;
}

export interface ProposalMemberItem {
  id: number;
  studentId: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: number;
  status: 'INVITED' | 'ACCEPTED' | 'DECLINED';
  isLead: boolean;
  joinedAt: string;
}

export interface ProposalDetailDto {
  id: string;
  title: string;
  abstract: string;
  domain: string;
  techStack: string[];
  submittedBy: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    departmentCode: string;
  };
  assignedFaculty: {
    id: string;
    name: string;
    email: string;
    designation: string;
    departmentCode: string;
  } | null;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  facultyComments: string | null;
  version: number;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  members: ProposalMemberItem[];
  projectId: string | null;
}

export interface CreateProposalInput {
  title: string;
  abstract: string;
  domain: string;
  subjectCode?: string;
  subjectName?: string;
  techStack: string[];
  assignedFacultyId?: string | null;
  initialStatus?: 'DRAFT' | 'SUBMITTED';
  coMemberStudentIds?: string[];
}

export interface UpdateProposalInput {
  title?: string;
  abstract?: string;
  domain?: string;
  subjectCode?: string;
  subjectName?: string;
  techStack?: string[];
  assignedFacultyId?: string | null;
}

export interface ReviewProposalInput {
  status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  facultyComments: string;
}

// Stage 8: Faculty Guide Allocation Interfaces
export interface ActiveProjectSummary {
  id: string;
  title: string;
  domain: string;
  status: string;
  overallProgress: number;
  leadStudentName?: string;
}

export interface FacultyCapacityItem {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  specialization: string;
  departmentId?: number;
  departmentCode?: string;
  maxProjects: number;
  currentlyAssigned: number;
  remainingCapacity: number;
  utilizationRate: number;
  status: 'AVAILABLE' | 'NEAR_CAPACITY' | 'FULL';
  activeProjects: ActiveProjectSummary[];
  pendingProposalsCount: number;
}

export interface AllocationMatrixDto {
  summary: {
    totalFaculty: number;
    totalCapacity: number;
    totalAssigned: number;
    availableSlots: number;
    overallUtilization: number;
  };
  faculty: FacultyCapacityItem[];
}

export interface PendingProposalSummary {
  id: string;
  title: string;
  domain: string;
  status: string;
  leadStudent: string;
  assignedFaculty: { id: string; name: string } | null;
  createdAt: string;
}

export interface ActiveProjectAllocationSummary {
  id: string;
  title: string;
  domain: string;
  status: string;
  overallProgress: number;
  currentGuide: { id: string; name: string } | null;
  leadStudent: string;
}

export interface UnallocatedItemsDto {
  pendingProposals: PendingProposalSummary[];
  activeProjects: ActiveProjectAllocationSummary[];
}

export interface GuideRecommendationDto {
  facultyId: string;
  name: string;
  designation: string;
  specialization: string;
  departmentCode: string;
  maxProjects: number;
  currentlyAssigned: number;
  remainingCapacity: number;
  matchScore: number;
  matchedKeywords: string[];
  recommendationReason: string;
}

export interface ReassignProjectGuideInput {
  newFacultyGuideId: string;
  reason: string;
}

export interface AssignProposalGuideInput {
  facultyId: string;
  allocateProject?: boolean;
}

export interface UpdateFacultyCapacityInput {
  maxProjects: number;
}

export interface AcademicBatchDto {
  id: number;
  name: string;
  startYear: number;
  endYear: number;
  isCurrent: boolean;
}

export interface DomainDto {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface FacultyListItemDto {
  id: string;
  name: string;
  email: string;
  designation: string;
  specialization: string;
  departmentCode: string;
  remainingCapacity: number;
}

export interface StudentListItemDto {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: number;
  departmentCode: string;
}

export type DocumentType =
  | 'PROPOSAL'
  | 'SRS'
  | 'ARCHITECTURE_DESIGN'
  | 'MID_TERM_REPORT'
  | 'FINAL_THESIS'
  | 'PRESENTATION'
  | 'SOURCE_CODE_ZIP';

export interface DocumentDto {
  id: string;
  projectId: string;
  uploadedBy: {
    id: string;
    fullName: string;
    role: string;
    email?: string;
  };
  documentType: DocumentType;
  fileName: string;
  originalFileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  mimeType: string;
  version: number;
  remarks?: string;
  milestoneId?: string;
  uploadedAt: string;
}

export interface ProjectDocumentsOverviewDto {
  projectId: string;
  projectTitle: string;
  totalDocuments: number;
  documents: DocumentDto[];
  latestByType: Partial<Record<DocumentType, DocumentDto>>;
}

export interface UploadDocumentInput {
  documentType: DocumentType;
  remarks?: string;
  milestoneId?: string;
}

export interface NotificationDto {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  projectId?: string;
  proposalId?: string;
  documentId?: string;
  reviewId?: string;
  milestoneId?: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedNotificationsDto {
  notifications: NotificationDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface IRubricCriterionScore {
  criterionKey: string;
  label: string;
  weight: number;
  score: number;
  remarks?: string;
}

export type LetterGrade = 'O' | 'A+' | 'A' | 'B+' | 'B' | 'RA';
export type EvaluationStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED';

export interface EvaluationDto {
  id: string;
  projectId: string;
  evaluatorId: string;
  evaluatorName?: string;
  evaluatorEmail?: string;
  status: 'DRAFT' | 'SUBMITTED';
  rubricScores: IRubricCriterionScore[];
  totalWeightedScore: number;
  letterGrade: LetterGrade;
  generalFeedback: string;
  recommendations?: string;
  isPassed: boolean;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationEligibilityDto {
  eligible: boolean;
  reasons: string[];
  canEvaluate: boolean;
  projectStatus: string;
  overallProgress: number;
  milestonesCount: number;
  completedMilestonesCount: number;
  documentsCount: number;
  qualifyingDocumentsCount: number;
  currentEvaluationStatus: EvaluationStatus;
  standardRubric: IRubricCriterionScore[];
}

export interface EvaluationResponseDto {
  evaluation: EvaluationDto | null;
  status: EvaluationStatus;
  isReleased: boolean;
}


