import { useQuery } from '@tanstack/react-query';
import { getMe } from '../api/auth';
import { useAuthStore } from '../stores/auth';

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: accessToken !== null,
  });
}
