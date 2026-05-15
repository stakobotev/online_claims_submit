import { apiClient } from './client';
import type { Complaint, PaginatedResponse, PublicConfig, Category } from '../types';

export interface SubmitComplaintPayload {
  categoryId: string;
  institutionId?: string;
  institutionFreeText?: string;
  title: string;
  body: string;
  urgent?: boolean;
  contactName?: string;
  contactEmail?: string;
  captchaToken?: string;
  attachments?: File[];
}

export interface SubmitComplaintResponse {
  publicId: string;
  status: string;
  message: string;
}

export async function submitComplaint(payload: SubmitComplaintPayload): Promise<SubmitComplaintResponse> {
  const form = new FormData();
  form.append('categoryId', payload.categoryId);
  if (payload.institutionId) form.append('institutionId', payload.institutionId);
  if (payload.institutionFreeText) form.append('institutionFreeText', payload.institutionFreeText);
  form.append('title', payload.title);
  form.append('body', payload.body);
  if (payload.urgent !== undefined) form.append('urgent', String(payload.urgent));
  if (payload.contactName) form.append('contactName', payload.contactName);
  if (payload.contactEmail) form.append('contactEmail', payload.contactEmail);
  if (payload.captchaToken) form.append('captchaToken', payload.captchaToken);
  if (payload.attachments) {
    payload.attachments.forEach((f) => form.append('attachments', f));
  }
  const res = await apiClient.post<SubmitComplaintResponse>('/complaints', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export interface ListComplaintsParams {
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

export async function listMyComplaints(params?: ListComplaintsParams): Promise<PaginatedResponse<Complaint>> {
  const res = await apiClient.get<PaginatedResponse<Complaint>>('/complaints', { params });
  return res.data;
}

export async function getComplaint(publicId: string): Promise<Complaint> {
  const res = await apiClient.get<Complaint>(`/complaints/${publicId}`);
  return res.data;
}

export async function getCategories(): Promise<Category[]> {
  const res = await apiClient.get<Category[]>('/categories');
  return res.data;
}

export async function getPublicConfig(): Promise<PublicConfig> {
  const res = await apiClient.get<PublicConfig>('/config/public');
  return res.data;
}
