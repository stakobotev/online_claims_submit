import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminListUsers, adminUpdateUser, adminAnonymizeUser } from '../../api/admin';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { formatDateTime } from '../../utils/formatters';
import type { User, UserStatus } from '../../types';

const PAGE_SIZE = 20;

export function Users() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [anonymizeUser, setAnonymizeUser] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, roleFilter, statusFilter],
    queryFn: () => adminListUsers({ page, size: PAGE_SIZE, role: roleFilter || undefined, status: statusFilter || undefined }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; status?: string } }) =>
      adminUpdateUser(id, data),
    onSuccess: () => { toast.success(t('admin.userUpdated', 'User updated')); invalidate(); },
    onError: () => toast.error(t('errors.generic')),
  });

  const anonymizeMut = useMutation({
    mutationFn: (id: string) => adminAnonymizeUser(id),
    onSuccess: () => {
      setAnonymizeUser(null);
      toast.success(t('admin.anonymized', 'User anonymized (GDPR)'));
      invalidate();
    },
    onError: () => toast.error(t('errors.generic')),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.nav.users', 'Users')}</h1>

      <div className="flex flex-wrap gap-2">
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-32">
          <option value="">{t('admin.allRoles', 'All roles')}</option>
          <option value="admin">{t('role.admin', 'Admin')}</option>
          <option value="user">{t('role.user', 'User')}</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">{t('admin.allStatuses', 'All statuses')}</option>
          {(['active', 'blocked', 'deactivated', 'pending_confirmation'] as UserStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
      {!isLoading && data?.data.length === 0 && (
        <EmptyState title={t('admin.noUsers', 'No users found')} />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pr-4">{t('auth.email', 'Email')}</th>
                  <th className="py-3 pr-4">{t('auth.name', 'Name')}</th>
                  <th className="py-3 pr-4">{t('admin.role', 'Role')}</th>
                  <th className="py-3 pr-4">{t('admin.status', 'Status')}</th>
                  <th className="py-3 pr-4">{t('complaint.submitted', 'Joined')}</th>
                  <th className="py-3">{t('admin.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">{u.email}</td>
                    <td className="py-3 pr-4">{u.name ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <Select
                        value={u.role}
                        className="w-24 h-7 text-xs"
                        onChange={(e) => updateMut.mutate({ id: u.id, data: { role: e.target.value } })}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </Select>
                    </td>
                    <td className="py-3 pr-4">
                      <Select
                        value={u.status}
                        className="w-36 h-7 text-xs"
                        onChange={(e) => updateMut.mutate({ id: u.id, data: { status: e.target.value } })}
                      >
                        {(['active', 'blocked', 'deactivated'] as UserStatus[]).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDateTime(u.createdAt)}</td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAnonymizeUser(u)}
                        className="text-red-600 hover:bg-red-50 text-xs"
                      >
                        {t('admin.anonymize', 'Anonymize')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data.pages} onPage={setPage} />
        </>
      )}

      <Modal
        open={anonymizeUser !== null}
        onClose={() => setAnonymizeUser(null)}
        title={t('admin.anonymizeConfirmTitle', 'Anonymize user (GDPR)')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            {t('admin.anonymizeConfirmBody', {
              email: anonymizeUser?.email,
              defaultValue: `This will permanently replace all personal data for {{email}} with anonymous placeholders. Complaint records will be retained. This action cannot be undone.`,
            })}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAnonymizeUser(null)}>{t('actions.cancel')}</Button>
            <Button
              variant="danger"
              loading={anonymizeMut.isPending}
              onClick={() => anonymizeUser && anonymizeMut.mutate(anonymizeUser.id)}
            >
              {t('admin.anonymize', 'Anonymize')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
