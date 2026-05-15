import Papa from 'papaparse';

export function generateCsv(data: Record<string, unknown>[]): string {
  return Papa.unparse(data);
}
