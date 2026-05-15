import Handlebars from 'handlebars';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { enqueueEmail } from './outbox.repository.js';
import { config } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, 'templates');

function loadTemplate(name: string, ext: 'html' | 'txt'): HandlebarsTemplateDelegate {
  const src = readFileSync(join(TEMPLATES_DIR, `${name}.${ext}`), 'utf8');
  return Handlebars.compile(src);
}

const templateCache = new Map<string, { html: HandlebarsTemplateDelegate; txt: HandlebarsTemplateDelegate }>();

function getTemplate(name: string) {
  if (!templateCache.has(name)) {
    templateCache.set(name, {
      html: loadTemplate(name, 'html'),
      txt: loadTemplate(name, 'txt'),
    });
  }
  return templateCache.get(name)!;
}

export interface EnqueueMailOptions {
  template: string;
  to: string;
  subject: string;
  data: Record<string, unknown>;
  relatedComplaintId?: string;
  relatedUserId?: string;
}

export async function enqueueMail(opts: EnqueueMailOptions): Promise<void> {
  const tpl = getTemplate(opts.template);
  const bodyHtml = tpl.html(opts.data);
  const bodyText = tpl.txt(opts.data);

  await enqueueEmail({
    toAddress: opts.to,
    fromAddress: config.MAIL_FROM,
    subject: opts.subject,
    bodyHtml,
    bodyText,
    template: opts.template,
    relatedComplaintId: opts.relatedComplaintId,
    relatedUserId: opts.relatedUserId,
  });
}
