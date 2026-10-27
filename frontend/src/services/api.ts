import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    const errorResponse = error.response?.data;
    const message = errorResponse?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

import {
  ProposalDetailDto,
  CreateProposalInput,
  UpdateProposalInput,
  ReviewProposalInput,
  SystemSettingsDto,
  AllocationMatrixDto,
  UnallocatedItemsDto,
  GuideRecommendationDto,
  ReassignProjectGuideInput,
  AssignProposalGuideInput,
  UpdateFacultyCapacityInput,
  AcademicBatchDto,
  DomainDto,
  FacultyListItemDto,
  StudentListItemDto,
  MilestoneDto,
  DocumentDto,
  ProjectDocumentsOverviewDto,
  NotificationDto,
  PaginatedNotificationsDto,
  EvaluationEligibilityDto,
  EvaluationResponseDto,
  EvaluationDto,
  IRubricCriterionScore,
} from '../types';

export const proposalsApi = {
  getSettings: async (): Promise<SystemSettingsDto> => {
    const res = await apiClient.get<ApiResponse<SystemSettingsDto>>('/proposals/settings');
    return res.data.data!;
  },
  getProposals: async (): Promise<ProposalDetailDto[]> => {
    const res = await apiClient.get<ApiResponse<ProposalDetailDto[]>>('/proposals');
    return res.data.data || [];
  },
  getProposalById: async (id: string): Promise<ProposalDetailDto> => {
    const res = await apiClient.get<ApiResponse<ProposalDetailDto>>(`/proposals/${id}`);
    return res.data.data!;
  },
  create: async (data: CreateProposalInput): Promise<ProposalDetailDto> => {
    const res = await apiClient.post<ApiResponse<ProposalDetailDto>>('/proposals', data);
    return res.data.data!;
  },
  update: async (id: string, data: UpdateProposalInput): Promise<ProposalDetailDto> => {
    const res = await apiClient.put<ApiResponse<ProposalDetailDto>>(`/proposals/${id}`, data);
    return res.data.data!;
  },
  submit: async (id: string): Promise<ProposalDetailDto> => {
    const res = await apiClient.post<ApiResponse<ProposalDetailDto>>(`/proposals/${id}/submit`);
    return res.data.data!;
  },
  review: async (
    id: string,
    data: ReviewProposalInput
  ): Promise<{ proposal: ProposalDetailDto; instantiatedProjectId?: string }> => {
    const res = await apiClient.post<ApiResponse<{ proposal: ProposalDetailDto; instantiatedProjectId?: string }>>(
      `/proposals/${id}/review`,
      data
    );
    return res.data.data!;
  },
  addMember: async (id: string, studentId: string): Promise<ProposalDetailDto> => {
    const res = await apiClient.post<ApiResponse<ProposalDetailDto>>(`/proposals/${id}/members`, { studentId });
    return res.data.data!;
  },
  respondInvite: async (id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<ProposalDetailDto> => {
    const res = await apiClient.patch<ApiResponse<ProposalDetailDto>>(`/proposals/${id}/members/respond`, { status });
    return res.data.data!;
  },
  removeMember: async (id: string, memberId: string): Promise<ProposalDetailDto> => {
    const res = await apiClient.delete<ApiResponse<ProposalDetailDto>>(`/proposals/${id}/members/${memberId}`);
    return res.data.data!;
  },
};

export const projectsApi = {
  getById: async (id: string): Promise<unknown> => {
    const res = await apiClient.get<ApiResponse<unknown>>(`/projects/${id}`);
    return res.data.data;
  },
  updateRepo: async (id: string, repositoryUrl: string): Promise<{ projectId: string; repositoryUrl: string }> => {
    const res = await apiClient.patch<ApiResponse<{ projectId: string; repositoryUrl: string }>>(
      `/projects/${id}/repo`,
      { repositoryUrl }
    );
    return res.data.data!;
  },
};

export const allocationsApi = {
  getMatrix: async (departmentId?: number): Promise<AllocationMatrixDto> => {
    const res = await apiClient.get<ApiResponse<AllocationMatrixDto>>('/allocations/matrix', {
      params: departmentId ? { departmentId } : {},
    });
    return res.data.data!;
  },
  getUnallocated: async (): Promise<UnallocatedItemsDto> => {
    const res = await apiClient.get<ApiResponse<UnallocatedItemsDto>>('/allocations/unallocated');
    return res.data.data!;
  },
  getRecommendations: async (id: string): Promise<GuideRecommendationDto[]> => {
    const res = await apiClient.get<ApiResponse<GuideRecommendationDto[]>>(`/allocations/recommendations/${id}`);
    return res.data.data || [];
  },
  reassignProjectGuide: async (projectId: string, data: ReassignProjectGuideInput): Promise<unknown> => {
    const res = await apiClient.post<ApiResponse<unknown>>(`/allocations/projects/${projectId}/reassign`, data);
    return res.data.data;
  },
  assignProposalGuide: async (proposalId: string, data: AssignProposalGuideInput): Promise<unknown> => {
    const res = await apiClient.post<ApiResponse<unknown>>(`/allocations/proposals/${proposalId}/assign`, data);
    return res.data.data;
  },
  updateCapacity: async (facultyId: string, data: UpdateFacultyCapacityInput): Promise<unknown> => {
    const res = await apiClient.patch<ApiResponse<unknown>>(`/allocations/faculty/${facultyId}/capacity`, data);
    return res.data.data;
  },
};

export const batchesApi = {
  getAll: async (): Promise<AcademicBatchDto[]> => {
    const res = await apiClient.get<ApiResponse<AcademicBatchDto[]>>('/batches');
    return res.data.data || [];
  },
  create: async (data: {
    name: string;
    startYear: number;
    endYear: number;
    isCurrent?: boolean;
  }): Promise<AcademicBatchDto> => {
    const res = await apiClient.post<ApiResponse<AcademicBatchDto>>('/batches', data);
    return res.data.data!;
  },
};

export const domainsApi = {
  getAll: async (activeOnly?: boolean): Promise<DomainDto[]> => {
    const res = await apiClient.get<ApiResponse<DomainDto[]>>('/domains', {
      params: activeOnly !== undefined ? { activeOnly } : {},
    });
    return res.data.data || [];
  },
  create: async (data: { name: string; description?: string }): Promise<DomainDto> => {
    const res = await apiClient.post<ApiResponse<DomainDto>>('/domains', data);
    return res.data.data!;
  },
  toggleStatus: async (id: string, isActive: boolean): Promise<DomainDto> => {
    const res = await apiClient.patch<ApiResponse<DomainDto>>(`/domains/${id}/status`, { isActive });
    return res.data.data!;
  },
};

export const facultyApi = {
  getList: async (): Promise<FacultyListItemDto[]> => {
    const res = await apiClient.get<ApiResponse<FacultyListItemDto[]>>('/faculty/list');
    return res.data.data || [];
  },
  updateSpecialization: async (id: string, specialization: string): Promise<unknown> => {
    const res = await apiClient.patch<ApiResponse<unknown>>(`/faculty/${id}/specialization`, { specialization });
    return res.data.data;
  },
};

export const studentsApi = {
  getList: async (departmentId?: number): Promise<StudentListItemDto[]> => {
    const res = await apiClient.get<ApiResponse<StudentListItemDto[]>>('/students/list', {
      params: departmentId ? { departmentId } : {},
    });
    return res.data.data || [];
  },
};

export const milestonesApi = {
  getForProject: async (projectId: string): Promise<{
    projectId: string;
    projectTitle: string;
    overallProgress: number;
    milestones: MilestoneDto[];
  }> => {
    const res = await apiClient.get<ApiResponse<{
      projectId: string;
      projectTitle: string;
      overallProgress: number;
      milestones: MilestoneDto[];
    }>>(`/projects/${projectId}/milestones`);
    return res.data.data!;
  },
  updateProgress: async (
    projectId: string,
    milestoneId: string,
    data: { completionPercentage: number; studentRemarks?: string }
  ): Promise<{ milestone: MilestoneDto; overallProgress: number }> => {
    const res = await apiClient.patch<ApiResponse<{ milestone: MilestoneDto; overallProgress: number }>>(
      `/projects/${projectId}/milestones/${milestoneId}/progress`,
      data
    );
    return res.data.data!;
  },
  review: async (
    projectId: string,
    milestoneId: string,
    data: { status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'; facultyRemarks?: string; completionPercentage?: number }
  ): Promise<{ milestone: MilestoneDto; overallProgress: number }> => {
    const res = await apiClient.patch<ApiResponse<{ milestone: MilestoneDto; overallProgress: number }>>(
      `/projects/${projectId}/milestones/${milestoneId}/review`,
      data
    );
    return res.data.data!;
  },
  create: async (
    projectId: string,
    data: { title: string; description?: string; startDate: string; dueDate: string; completionPercentage?: number }
  ): Promise<MilestoneDto> => {
    const res = await apiClient.post<ApiResponse<MilestoneDto>>(`/projects/${projectId}/milestones`, data);
    return res.data.data!;
  },
};

export const documentsApi = {
  getForProject: async (projectId: string): Promise<ProjectDocumentsOverviewDto> => {
    const res = await apiClient.get<ApiResponse<ProjectDocumentsOverviewDto>>(`/projects/${projectId}/documents`);
    return res.data.data!;
  },
  getVersions: async (projectId: string, typeOrId: string): Promise<DocumentDto[]> => {
    const res = await apiClient.get<ApiResponse<DocumentDto[]>>(`/projects/${projectId}/documents/versions/${typeOrId}`);
    return res.data.data || [];
  },
  upload: async (projectId: string, formData: FormData): Promise<DocumentDto> => {
    const res = await apiClient.post<ApiResponse<DocumentDto>>(`/projects/${projectId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.data!;
  },
  download: async (projectId: string, documentId: string, originalFileName: string): Promise<void> => {
    const response = await apiClient.get(`/projects/${projectId}/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

export const notificationsApi = {
  getNotifications: async (params?: { page?: number; limit?: number; isRead?: boolean }): Promise<PaginatedNotificationsDto> => {
    const res = await apiClient.get<ApiResponse<PaginatedNotificationsDto>>('/notifications', { params });
    return res.data.data!;
  },
  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return res.data.data?.unreadCount || 0;
  },
  markAsRead: async (id: string): Promise<NotificationDto> => {
    const res = await apiClient.patch<ApiResponse<NotificationDto>>(`/notifications/${id}/read`);
    return res.data.data!;
  },
  markAllAsRead: async (): Promise<{ updatedCount: number }> => {
    const res = await apiClient.patch<ApiResponse<{ updatedCount: number }>>('/notifications/read-all');
    return res.data.data!;
  },
};

export const evaluationApi = {
  getEligibility: async (projectId: string): Promise<EvaluationEligibilityDto> => {
    const res = await apiClient.get<ApiResponse<EvaluationEligibilityDto>>(
      `/projects/${projectId}/evaluation/eligibility`
    );
    return res.data.data!;
  },
  getEvaluation: async (projectId: string): Promise<EvaluationResponseDto> => {
    const res = await apiClient.get<ApiResponse<EvaluationResponseDto>>(
      `/projects/${projectId}/evaluation`
    );
    return res.data.data!;
  },
  saveDraft: async (
    projectId: string,
    data: {
      rubricScores?: IRubricCriterionScore[];
      generalFeedback?: string;
      recommendations?: string;
    }
  ): Promise<EvaluationDto> => {
    const res = await apiClient.post<ApiResponse<EvaluationDto>>(
      `/projects/${projectId}/evaluation/draft`,
      data
    );
    return res.data.data!;
  },
  submit: async (
    projectId: string,
    data: {
      rubricScores: IRubricCriterionScore[];
      generalFeedback: string;
      recommendations?: string;
    }
  ): Promise<{ evaluation: EvaluationDto; project: any }> => {
    const res = await apiClient.post<ApiResponse<{ evaluation: EvaluationDto; project: any }>>(
      `/projects/${projectId}/evaluation/submit`,
      data
    );
    return res.data.data!;
  },
};




