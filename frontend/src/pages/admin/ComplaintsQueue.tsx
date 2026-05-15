import { useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminListComplaints,
  adminSearchComplaints,
  adminGetComplaint,
  adminGetComplaintEvents,
  approveComplaint,
  rejectComplaint,
  closeComplaint,
} from '../../api/admin';
import { getCategories } from '../../api/complaints';
import { StatusBadge } from '../../components/feedback/StatusBadge';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { formatDateTime } from '../../utils/formatters';
import type { ComplaintStatus } from '../../types';

const PAGE_SIZE = 20;

interface FiltersState {
  q: string;
  status: string;
  category: string;
  urgent: string;
}

export function ComplaintsQueue() {
  const { publicId } = useParams<{ publicId?: string }>();

  if (publicId) return <ComplaintAdminDetail publicId={publicId} />;

  return <ComplaintsTable />;
}

function ComplaintsTable() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersState>({ q: '', status: '', category: '', urgent: '' });
  const [searchInput, setSearchInput] = useState('');

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const params = {
    page,
    size: PAGE_SIZE,
    ...(filters.q ? { q: filters.q } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.urgent ? { urgent: filters.urgent === 'true' } : {}),
  };

  const fetchFn = filters.q ? adminSearchComplaints : adminListComplaints;
  const { data, isLoading } = useQuery({
    queryKey: ['admin-complaints', params],
    queryFn: () => fetchFn(params),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, q: searchInput }));
    setPage(1);
  };

  const updateFilter = (key: keyof FiltersState, val: string) => {
    setFilters((f) => ({ ...f, [key]: val }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.nav.complaints', 'Complaints')}</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('admin.search', 'Search complaints...')}
          className="max-w-xs"
        />
        <Button type="submit" size="sm">{t('admin.searchAction', 'Search')}</Button>
        {filters.q && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setFilters((f) => ({ ...f, q: '' })); }}>
            {t('admin.clearSearch', 'Clear')}
          </Button>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
        <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="w-40">
          <option value="">{t('admin.allStatuses', 'All statuses')}</option>
          {(['submitted', 'pending_review', 'approved', 'rejected', 'forwarded', 'closed'] as ComplaintStatus[]).map((s) => (
            <option key={s} value={s}>{t(`status.${s}`, s)}</option>
          ))}
        </Select>
        <Select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} className="w-40">
          <option value="">{t('admin.allCategories', 'All categories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select value={filters.urgent} onChange={(e) => updateFilter('urgent', e.target.value)} className="w-32">
          <option value="">{t('admin.allUrgency', 'All urgency')}</option>
          <option value="true">{t('complaint.urgent', 'Urgent')}</option>
          <option value="false">{t('admin.notUrgent', 'Not urgent')}</option>
        </Select>
      </div>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}

      {!isLoading && data?.data.length === 0 && (
        <EmptyState title={t('admin.noComplaints', 'No complaints found')} />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pr-4">{t('complaint.publicId', 'ID')}</th>
                  <th className="py-3 pr-4">{t('complaint.category', 'Category')}</th>
                  <th className="py-3 pr-4">{t('complaint.title', 'Title')}</th>
                  <th className="py-3 pr-4">{t('complaint.status', 'Status')}</th>
                  <th className="py-3 pr-4">{t('complaint.type', 'Type')}</th>
                  <th className="py-3 pr-4">{t('complaint.submitted', 'Date')}</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500">{c.publicId}</td>
                    <td className="py-3 pr-4 capitalize">{c.categoryId}</td>
                    <td className="py-3 pr-4 max-w-[200px] truncate">{c.title}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <StatusBadge status={c.status} />
                        {c.urgent && <Badge variant="danger">!</Badge>}
                      </div>
                    </td>
                    <td className="py-3 pr-4 capitalize text-gray-500">{c.submissionType}</td>
                    <td className="py-3 pr-4 text-gray-500">{formatDateTime(c.createdAt)}</td>
                    <td className="py-3">
                      <Link
                        to={`/admin/complaints/${c.publicId}`}
                        className="text-primary-600 hover:underline text-xs"
                      >
                        {t('admin.view', 'View')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data.pages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function ComplaintAdminDetail({ publicId }: { publicId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: complaint, isLoading } = useQuery({
    queryKey: ['admin-complaint', publicId],
    queryFn: () => adminGetComplaint(publicId),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['admin-complaint-events', publicId],
    queryFn: () => adminGetComplaintEvents(publicId),
    enabled: Boolean(complaint),
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['admin-complaint', publicId] });
    qc.invalidateQueries({ queryKey: ['admin-complaints'] });
  }, [qc, publicId]);

  const approveMut = useMutation({
    mutationFn: () => approveComplaint(publicId),
    onSuccess: () => { toast.success(t('admin.approved', 'Complaint approved')); invalidate(); },
    onError: () => toast.error(t('errors.generic')),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectComplaint(publicId, rejectReason),
    onSuccess: () => { setRejectOpen(false); toast.success(t('admin.rejected', 'Complaint rejected')); invalidate(); },
    onError: () => toast.error(t('errors.generic')),
  });

  const closeMut = useMutation({
    mutationFn: () => closeComplaint(publicId),
    onSuccess: () => { toast.success(t('admin.closed', 'Complaint closed')); invalidate(); },
    onError: () => toast.error(t('errors.generic')),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (!complaint) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/complaints" className="text-sm text-gray-500 hover:text-gray-700">← {t('actions.back')}</Link>
        <h1 className="text-2xl font-bold text-gray-900">{complaint.publicId}</h1>
        <StatusBadge status={complaint.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>{t('complaint.details', 'Details')}</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">{t('complaint.title', 'Title')}</p><p className="font-medium">{complaint.title}</p></div>
            <div><p className="text-gray-500">{t('complaint.category', 'Category')}</p><p className="font-medium">{complaint.categoryId}</p></div>
            <div><p className="text-gray-500">{t('complaint.institution', 'Institution')}</p><p className="font-medium">{complaint.institution?.name ?? complaint.institutionFreeText ?? '—'}</p></div>
            <div><p className="text-gray-500">{t('complaint.type', 'Type')}</p><p className="font-medium capitalize">{complaint.submissionType}</p></div>
            <div><p className="text-gray-500">{t('complaint.submitted', 'Submitted')}</p><p className="font-medium">{formatDateTime(complaint.createdAt)}</p></div>
            {complaint.contactEmail && <div><p className="text-gray-500">{t('complaint.contactEmail', 'Contact email')}</p><p className="font-medium">{complaint.contactEmail}</p></div>}
          </div>
          <hr className="border-gray-100" />
          <div>
            <p className="text-sm text-gray-500 mb-1">{t('complaint.body', 'Description')}</p>
            <p className="text-gray-800 whitespace-pre-wrap">{complaint.body}</p>
          </div>
          {complaint.attachments && complaint.attachments.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">{t('complaint.attachments', 'Attachments')}</p>
              <ul className="space-y-1">
                {complaint.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={`/api/attachments/${a.id}`} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">{a.originalFilename}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Action buttons by status */}
      <div className="flex gap-3 flex-wrap">
        {complaint.status === 'pending_review' && (
          <>
            <Button onClick={() => approveMut.mutate()} loading={approveMut.isPending}>{t('admin.approve', 'Approve')}</Button>
            <Button variant="danger" onClick={() => setRejectOpen(true)}>{t('admin.reject', 'Reject')}</Button>
          </>
        )}
        {complaint.status === 'forwarded' && (
          <Button variant="secondary" onClick={() => closeMut.mutate()} loading={closeMut.isPending}>{t('admin.close', 'Close')}</Button>
        )}
      </div>

      {/* Events timeline */}
      {events.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t('admin.timeline', 'Timeline')}</CardTitle></CardHeader>
          <CardBody>
            <ol className="space-y-3">
              {events.map((ev) => (
                <li key={ev.id} className="flex gap-3 text-sm">
                  <span className="text-gray-400 shrink-0">{formatDateTime(ev.at)}</span>
                  <span className="font-medium text-gray-700">{ev.event}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title={t('admin.rejectComplaint', 'Reject complaint')}>
        <div className="space-y-4">
          <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700">
            {t('admin.rejectReason', 'Reason (required)')}
          </label>
          <textarea
            id="reject-reason"
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t('actions.cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => rejectMut.mutate()}
              loading={rejectMut.isPending}
              disabled={!rejectReason.trim()}
            >
              {t('admin.reject', 'Reject')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
