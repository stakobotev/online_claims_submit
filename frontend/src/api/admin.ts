import { apiClient } from './client';
import type { Complaint, ComplaintEvent, User, PaginatedResponse } from '../types';

export interface AdminComplaintsParams {
  q?: string;
  category?: string;
  institutionId?: string;
  status?: string;
  from?: string;
  to?: string;
  urgent?: boolean;
  page?: number;
  size?: number;
}

export async function adminListComplaints(
  params?: AdminComplaintsParams,
): Promise<PaginatedResponse<Complaint>> {
  const res = await apiClient.get<PaginatedResponse<Complaint>>('/complaints', { params });
  return res.data;
}

export async function adminSearchComplaints(
  params?: AdminComplaintsParams,
): Promise<PaginatedResponse<Complaint>> {
  const res = await apiClient.get<PaginatedResponse<Complaint>>('/admin/complaints/search', { params });
  return res.data;
}

export async function adminGetComplaint(publicId: string): Promise<Complaint> {
  const res = await apiClient.get<Complaint>(`/complaints/${publicId}`);
  return res.data;
}

export async function adminGetComplaintEvents(publicId: string): Promise<ComplaintEvent[]> {
  const res = await apiClient.get<ComplaintEvent[]>(`/admin/complaints/${publicId}/events`);
  return res.data;
}

export async function approveComplaint(publicId: string): Promise<void> {
  await apiClient.post(`/admin/complaints/${publicId}/approve`);
}

export async function rejectComplaint(publicId: string, reason: string): Promise<void> {
  await apiClient.post(`/admin/complaints/${publicId}/reject`, { reason });
}

export async function closeComplaint(publicId: string): Promise<void> {
  await apiClient.patch(`/admin/complaints/${publicId}/status`, { status: 'closed' });
}

export interface AdminUsersParams {
  q?: string;
  role?: string;
  status?: string;
  page?: number;
  size?: number;
}

export async function adminListUsers(params?: AdminUsersParams): Promise<PaginatedResponse<User>> {
  const res = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params });
  return res.data;
}

export async function adminUpdateUser(
  id: string,
  data: { role?: string; status?: string },
): Promise<User> {
  const res = await apiClient.patch<User>(`/admin/users/${id}`, data);
  return res.data;
}

export async function adminAnonymizeUser(id: string): Promise<{ anonymized: boolean }> {
  const res = await apiClient.post<{ anonymized: boolean }>(`/admin/users/${id}/anonymize`);
  return res.data;
}
