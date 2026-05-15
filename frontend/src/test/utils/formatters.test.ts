import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, publicIdPattern } from '../../utils/formatters';

describe('formatDate', () => {
  it('formats ISO string to dd MMM yyyy', () => {
    const result = formatDate('2026-01-15T10:00:00.000Z');
    expect(result).toMatch(/15 Jan 2026/);
  });

  it('accepts a custom format pattern', () => {
    const result = formatDate('2026-06-01T00:00:00.000Z', 'yyyy/MM/dd');
    expect(result).toBe('2026/06/01');
  });

  it('returns the input string when it is not a valid ISO date', () => {
    const result = formatDate('not-a-date');
    expect(result).toBe('not-a-date');
  });
});

describe('formatDateTime', () => {
  it('formats ISO string to dd MMM yyyy HH:mm', () => {
    // Use a fixed UTC time; date-fns formats in local time, so we just check pattern
    const result = formatDateTime('2026-03-20T14:30:00.000Z');
    expect(result).toMatch(/\d{2} \w{3} 2026 \d{2}:\d{2}/);
  });
});

describe('publicIdPattern', () => {
  it('matches valid VLC public IDs', () => {
    const pattern = publicIdPattern();
    expect(pattern.test('VLC-2026-000001')).toBe(true);
    expect(pattern.test('VLC-2030-999999')).toBe(true);
  });

  it('does not match malformed IDs', () => {
    const pattern = publicIdPattern();
    expect(pattern.test('vlc-2026-000001')).toBe(false);
    expect(pattern.test('VLC-2026-00001')).toBe(false);
    expect(pattern.test('VLC-26-000001')).toBe(false);
    expect(pattern.test('ABC-2026-000001')).toBe(false);
  });
});
