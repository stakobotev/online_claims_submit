import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listMyComplaints, getComplaint, submitComplaint } from '../api/complaints';
import type { ListComplaintsParams, SubmitComplaintPayload } from '../api/complaints';

export function useMyComplaints(params?: ListComplaintsParams) {
  return useQuery({
    queryKey: ['my-complaints', params],
    queryFn: () => listMyComplaints(params),
  });
}

export function useComplaint(publicId: string) {
  return useQuery({
    queryKey: ['complaint', publicId],
    queryFn: () => getComplaint(publicId),
    enabled: Boolean(publicId),
  });
}

export function useSubmitComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitComplaintPayload) => submitComplaint(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-complaints'] });
    },
  });
}
