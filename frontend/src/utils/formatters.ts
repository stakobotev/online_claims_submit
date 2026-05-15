import { format, parseISO } from 'date-fns';

export function formatDate(iso: string, pattern = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  return formatDate(iso, 'dd MMM yyyy HH:mm');
}

export function publicIdPattern(): RegExp {
  return /^VLC-\d{4}-\d{6}$/;
}
