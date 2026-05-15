export type UserRole = 'admin' | 'user';

export type UserStatus = 'draft' | 'pending_confirmation' | 'active' | 'blocked' | 'deactivated';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  anonymizedAt: string | null;
}

export type ComplaintStatus =
  | 'submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'forwarded'
  | 'closed';

export type SubmissionType = 'authenticated' | 'anonymous';

export interface Category {
  id: string;
  name: string;
}

export interface Institution {
  id: string;
  categoryId: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  complaintId: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ComplaintEvent {
  id: string;
  complaintId: string;
  event: string;
  actorId: string | null;
  at: string;
  metadata: Record<string, unknown>;
}

export interface Complaint {
  id: string;
  publicId: string;
  userId: string | null;
  categoryId: string;
  institutionId: string | null;
  institutionFreeText: string | null;
  title: string;
  body: string;
  urgent: boolean;
  contactName: string | null;
  contactEmail: string | null;
  status: ComplaintStatus;
  submissionType: SubmissionType;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  forwardedAt: string | null;
  closedAt: string | null;
  attachments?: Attachment[];
  events?: ComplaintEvent[];
  category?: Category;
  institution?: Institution | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface StatsSummary {
  totalComplaints: number;
  totalForwarded: number;
  byCategory: { id: string; count: number }[];
  byUrgency: { urgent: number; normal: number };
}

export interface StatsDetail extends StatsSummary {
  byStatus: { status: ComplaintStatus; count: number }[];
  byMonth: { month: string; count: number }[];
  bySubmissionType: { type: SubmissionType; count: number }[];
  byInstitution: { institutionId: string; name: string; count: number }[];
}

export interface PublicConfig {
  minBodyLength: number;
  maxAttachments: number;
  maxAttachmentTotalBytes: number;
  allowedAttachmentMime: string[];
  captchaSiteKey: string;
  oauthProviders: string[];
  locales: string[];
}

export interface ApiError extends Error {
  code: string;
  details: unknown;
  status: number;
}
