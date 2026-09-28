import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

export const apiClient = axios.create({
  baseURL: '/api',
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
