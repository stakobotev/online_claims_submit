import { appendAudit, type AuditEntry } from './auditLog.repository.js';
import { logger } from '../../lib/logger.js';

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await appendAudit(entry);
  } catch (err) {
    logger.error({ err, event: entry.event }, 'Failed to write audit log');
  }
}
