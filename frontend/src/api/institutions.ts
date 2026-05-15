import { apiClient } from './client';
import type { Institution, PaginatedResponse } from '../types';

export interface ListInstitutionsParams {
  category?: string;
  q?: string;
  page?: number;
  size?: number;
}

export async function listInstitutions(params?: ListInstitutionsParams): Promise<PaginatedResponse<Institution>> {
  const res = await apiClient.get<PaginatedResponse<Institution>>('/institutions', { params });
  return res.data;
}

export async function createInstitution(data: {
  categoryId: string;
  name: string;
  email: string;
}): Promise<Institution> {
  const res = await apiClient.post<Institution>('/admin/institutions', data);
  return res.data;
}

export async function updateInstitution(
  id: string,
  data: Partial<{ categoryId: string; name: string; email: string; active: boolean }>,
): Promise<Institution> {
  const res = await apiClient.patch<Institution>(`/admin/institutions/${id}`, data);
  return res.data;
}

export async function deleteInstitution(id: string): Promise<void> {
  await apiClient.delete(`/admin/institutions/${id}`);
}
