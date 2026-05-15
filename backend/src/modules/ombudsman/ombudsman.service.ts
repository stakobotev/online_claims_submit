import { enqueueMail } from '../email/email.service.js';
import { config } from '../../config/index.js';

export interface ForwardToOmbudsmanOptions {
  publicId: string;
  categoryName: string;
  institutionName: string;
  title: string;
  body: string;
  urgent: boolean;
  submittedAt: string;
  relatedComplaintId: string;
}

export async function forwardToOmbudsman(opts: ForwardToOmbudsmanOptions): Promise<void> {
  await enqueueMail({
    template: 'complaint.to_ombudsman',
    to: config.OMBUDSMAN_EMAIL,
    subject: `[Vallentin Claims] Complaint ${opts.publicId} — ${opts.title}`,
    data: {
      publicId: opts.publicId,
      categoryName: opts.categoryName,
      institutionName: opts.institutionName,
      title: opts.title,
      body: opts.body,
      urgent: opts.urgent,
      submittedAt: opts.submittedAt,
    },
    relatedComplaintId: opts.relatedComplaintId,
  });
}
