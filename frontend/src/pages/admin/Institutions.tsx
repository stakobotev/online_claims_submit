import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listInstitutions, createInstitution, updateInstitution, deleteInstitution } from '../../api/institutions';
import { getCategories } from '../../api/complaints';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { FormField } from '../../components/ui/FormField';
import { toast } from '../../components/ui/Toast';
import type { Institution } from '../../types';

const PAGE_SIZE = 20;

const schema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
});
type FormData = z.infer<typeof schema>;

export function Institutions() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editInst, setEditInst] = useState<Institution | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Institution | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-institutions', page],
    queryFn: () => listInstitutions({ page, size: PAGE_SIZE }),
  });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-institutions'] });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) => createInstitution(d),
    onSuccess: () => { toast.success(t('admin.institutionCreated', 'Institution created')); setModalOpen(false); reset(); invalidate(); },
    onError: () => toast.error(t('errors.generic')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => updateInstitution(id, data),
    onSuccess: () => { toast.success(t('admin.institutionUpdated', 'Institution updated')); setEditInst(null); reset(); invalidate(); },
    onError: () => toast.error(t('errors.generic')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteInstitution(id),
    onSuccess: () => { toast.success(t('admin.institutionDeleted', 'Institution deactivated')); setDeleteConfirm(null); invalidate(); },
    onError: () => toast.error(t('errors.generic')),
  });

  const openCreate = () => { reset({ categoryId: '', name: '', email: '' }); setEditInst(null); setModalOpen(true); };
  const openEdit = (inst: Institution) => { reset({ categoryId: inst.categoryId, name: inst.name, email: inst.email }); setEditInst(inst); setModalOpen(true); };

  const onSubmit = (data: FormData) => {
    if (editInst) updateMut.mutate({ id: editInst.id, data });
    else createMut.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.nav.institutions', 'Institutions')}</h1>
        <Button onClick={openCreate}>{t('admin.addInstitution', 'Add institution')}</Button>
      </div>

      {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
      {!isLoading && data?.data.length === 0 && (
        <EmptyState title={t('admin.noInstitutions', 'No institutions yet')} />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="py-3 pr-4">{t('auth.name', 'Name')}</th>
                  <th className="py-3 pr-4">{t('complaint.category', 'Category')}</th>
                  <th className="py-3 pr-4">{t('auth.email', 'Email')}</th>
                  <th className="py-3 pr-4">{t('admin.active', 'Active')}</th>
                  <th className="py-3">{t('admin.actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((inst) => (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium">{inst.name}</td>
                    <td className="py-3 pr-4 capitalize">{inst.categoryId}</td>
                    <td className="py-3 pr-4 text-gray-500">{inst.email}</td>
                    <td className="py-3 pr-4">{inst.active ? '✓' : '—'}</td>
                    <td className="py-3 flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(inst)}>{t('actions.edit', 'Edit')}</Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm(inst)}>{t('actions.delete')}</Button>
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editInst ? t('admin.editInstitution', 'Edit institution') : t('admin.addInstitution', 'Add institution')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label={t('complaint.category', 'Category')} htmlFor="inst-cat" error={errors.categoryId?.message} required>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select id="inst-cat" error={errors.categoryId?.message} {...field}>
                  <option value="" disabled>{t('complaint.selectCategory', 'Select category')}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              )}
            />
          </FormField>
          <FormField label={t('auth.name', 'Name')} htmlFor="inst-name" error={errors.name?.message} required>
            <Input id="inst-name" error={errors.name?.message} {...register('name')} />
          </FormField>
          <FormField label={t('auth.email', 'Email')} htmlFor="inst-email" error={errors.email?.message} required>
            <Input id="inst-email" type="email" error={errors.email?.message} {...register('email')} />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>{t('actions.cancel')}</Button>
            <Button type="submit" loading={isSubmitting || createMut.isPending || updateMut.isPending}>
              {editInst ? t('actions.save') : t('admin.addInstitution', 'Add')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title={t('admin.deleteInstitution', 'Deactivate institution')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{t('admin.deleteInstitutionBody', { name: deleteConfirm?.name, defaultValue: 'Deactivate {{name}}? It will no longer appear in dropdowns.' })}</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('actions.cancel')}</Button>
            <Button variant="danger" loading={deleteMut.isPending} onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm.id)}>
              {t('actions.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
