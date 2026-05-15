import { apiClient } from './client';
import type { StatsSummary, StatsDetail } from '../types';

export async function getStatsSummary(): Promise<StatsSummary> {
  const res = await apiClient.get<StatsSummary>('/statistics/summary');
  return res.data;
}

export async function getStatsDetail(params?: { from?: string; to?: string }): Promise<StatsDetail> {
  const res = await apiClient.get<StatsDetail>('/admin/statistics/detail', { params });
  return res.data;
}

export async function exportStatistics(params: {
  format: 'csv' | 'pdf';
  from?: string;
  to?: string;
}): Promise<Blob> {
  const res = await apiClient.get('/admin/statistics/export', {
    params,
    responseType: 'blob',
  });
  return res.data as Blob;
}
