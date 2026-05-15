import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import type { ComplaintStatus } from '../../types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusVariant: Record<ComplaintStatus, BadgeVariant> = {
  submitted: 'info',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  forwarded: 'success',
  closed: 'neutral',
};

interface StatusBadgeProps {
  status: ComplaintStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge variant={statusVariant[status]}>
      {t(`status.${status}`, status.replace('_', ' '))}
    </Badge>
  );
}
