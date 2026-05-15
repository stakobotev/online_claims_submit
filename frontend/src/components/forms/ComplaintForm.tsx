import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { FormField } from '../ui/FormField';
import { FileDropzone } from '../ui/FileDropzone';
import { getCategories, getPublicConfig, submitComplaint } from '../../api/complaints';
import { listInstitutions } from '../../api/institutions';
import { useAuthStore } from '../../stores/auth';
import type { SubmitComplaintResponse } from '../../api/complaints';

const HCAPTCHA_SITE_KEY =
  import.meta.env['VITE_HCAPTCHA_SITE_KEY'] ?? '10000000-ffff-ffff-ffff-000000000001';

const buildSchema = (minBodyLength: number) =>
  z
    .object({
      categoryId: z.string().min(1, 'Category is required'),
      useInstitutionFreeText: z.boolean(),
      institutionId: z.string().optional(),
      institutionFreeText: z.string().optional(),
      title: z.string().min(5, 'Title must be at least 5 characters'),
      body: z.string().min(minBodyLength, `Body must be at least ${minBodyLength} characters`),
      urgent: z.boolean(),
      contactName: z.string().optional(),
      contactEmail: z.union([z.string().email(), z.literal('')]).optional(),
    })
    .refine(
      (d) => {
        if (d.useInstitutionFreeText) return (d.institutionFreeText ?? '').trim().length > 0;
        return (d.institutionId ?? '').trim().length > 0;
      },
      { path: ['institutionId'], message: 'Institution is required' },
    );

type FormData = {
  categoryId: string;
  useInstitutionFreeText: boolean;
  institutionId?: string;
  institutionFreeText?: string;
  title: string;
  body: string;
  urgent: boolean;
  contactName?: string;
  contactEmail?: string;
};

interface ComplaintFormProps {
  onSuccess: (result: SubmitComplaintResponse) => void;
}

export function ComplaintForm({ onSuccess }: ComplaintFormProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = user !== null;

  const captchaRef = useRef<HCaptcha>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ['public-config'],
    queryFn: getPublicConfig,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const minBodyLength = config?.minBodyLength ?? 100;
  const maxAttachments = config?.maxAttachments ?? 3;
  const maxTotalBytes = config?.maxAttachmentTotalBytes ?? 5 * 1024 * 1024;

  const schema = buildSchema(minBodyLength);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { useInstitutionFreeText: false, urgent: false },
  });

  const selectedCategory = watch('categoryId');
  const useFreeText = watch('useInstitutionFreeText');
  const bodyValue = watch('body') ?? '';

  const { data: institutionsData } = useQuery({
    queryKey: ['institutions', selectedCategory],
    queryFn: () => listInstitutions({ category: selectedCategory, size: 100 }),
    enabled: Boolean(selectedCategory) && !useFreeText,
  });

  const institutions = institutionsData?.data ?? [];

  const onSubmit = async (data: FormData) => {
    if (!isAuthenticated && !captchaToken) {
      setServerError(t('auth.captchaRequired', 'Please complete the CAPTCHA'));
      return;
    }
    setServerError(null);
    try {
      const result = await submitComplaint({
        categoryId: data.categoryId,
        institutionId: data.useInstitutionFreeText ? undefined : data.institutionId,
        institutionFreeText: data.useInstitutionFreeText ? data.institutionFreeText : undefined,
        title: data.title,
        body: data.body,
        urgent: data.urgent,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
        captchaToken: captchaToken ?? undefined,
        attachments,
      });
      onSuccess(result);
    } catch (err) {
      const e = err as { message?: string; code?: string };
      setServerError(e.message ?? t('errors.generic'));
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <FormField label={t('complaint.category', 'Category')} htmlFor="cat" error={errors.categoryId?.message} required>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select id="cat" placeholder={t('complaint.selectCategory', 'Select a category')} error={errors.categoryId?.message} {...field}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{t(`category.${c.id}`, c.name)}</option>
              ))}
            </Select>
          )}
        />
      </FormField>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {t('complaint.institution', 'Institution')} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <Controller
            control={control}
            name="useInstitutionFreeText"
            render={({ field }) => (
              <button
                type="button"
                className="text-xs text-primary-600 hover:underline"
                onClick={() => field.onChange(!field.value)}
              >
                {field.value
                  ? t('complaint.switchToDropdown', 'Select from list')
                  : t('complaint.switchToFreeText', 'Type institution name')}
              </button>
            )}
          />
        </div>

        {useFreeText ? (
          <Input
            id="inst-free"
            placeholder={t('complaint.institutionFreeTextPlaceholder', 'Enter institution name')}
            error={errors.institutionFreeText?.message ?? errors.institutionId?.message}
            {...register('institutionFreeText')}
          />
        ) : (
          <Controller
            control={control}
            name="institutionId"
            render={({ field }) => (
              <Select
                id="inst"
                placeholder={t('complaint.selectInstitution', 'Select institution')}
                error={errors.institutionId?.message}
                disabled={!selectedCategory}
                {...field}
              >
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </Select>
            )}
          />
        )}
      </div>

      <FormField label={t('complaint.title', 'Title')} htmlFor="comp-title" error={errors.title?.message} required>
        <Input id="comp-title" placeholder={t('complaint.titlePlaceholder', 'Brief summary of your complaint')} error={errors.title?.message} {...register('title')} />
      </FormField>

      <FormField
        label={t('complaint.body', 'Description')}
        htmlFor="comp-body"
        error={errors.body?.message}
        required
        hint={t('complaint.bodyHint', { min: minBodyLength })}
      >
        <Textarea
          id="comp-body"
          rows={6}
          placeholder={t('complaint.bodyPlaceholder', 'Describe your complaint in detail')}
          error={errors.body?.message}
          {...register('body')}
        />
        <p className={`text-xs mt-1 ${bodyValue.length >= minBodyLength ? 'text-green-600' : 'text-gray-400'}`}>
          {bodyValue.length} / {minBodyLength} {t('complaint.minChars', 'chars minimum')}
        </p>
      </FormField>

      <div className="space-y-3">
        <Controller
          control={control}
          name="urgent"
          render={({ field }) => (
            <Checkbox
              id="urgent"
              label={t('complaint.urgent', 'This is urgent')}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="rounded-md border border-gray-200 p-4 space-y-3 bg-gray-50">
        <p className="text-sm font-medium text-gray-700">{t('complaint.contactOptional', 'Contact details (optional)')}</p>
        <FormField label={t('complaint.contactName', 'Your name')} htmlFor="contact-name" error={errors.contactName?.message}>
          <Input id="contact-name" placeholder={t('complaint.contactNamePlaceholder', 'Jane Doe')} {...register('contactName')} />
        </FormField>
        <FormField label={t('complaint.contactEmail', 'Email for confirmation copy')} htmlFor="contact-email" error={errors.contactEmail?.message}>
          <Input id="contact-email" type="email" placeholder="jane@example.com" {...register('contactEmail')} />
        </FormField>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">{t('complaint.attachments', 'Attachments')}</p>
        <FileDropzone
          files={attachments}
          onChange={setAttachments}
          maxFiles={maxAttachments}
          maxTotalBytes={maxTotalBytes}
        />
      </div>

      {!isAuthenticated && (
        <div className="pt-2">
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
          />
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        {t('actions.submit')}
      </Button>
    </form>
  );
}
