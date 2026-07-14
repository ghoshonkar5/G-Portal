// ═══════════════════════════════════════════════════════════════════
// University Research Admin — Stats API Module
// Frontend API wrapper for the new /api/admin/stats/* endpoints
// ═══════════════════════════════════════════════════════════════════

const API_BASE = '/api';

const authHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const jsonHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

async function handleResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return { ...data, success: false, status: response.status };
  }
  return data;
}

export interface TimeseriesResponse {
  success: boolean;
  data: {
    years: string[];
    series: { name: string; color: string; values: number[] }[];
  };
}

export interface QuartileDistItem {
  label: string;
  value: number;
  color: string;
}

export interface DeptDistItem {
  dept: string;
  value: number;
}

export interface TopContributor {
  name: string;
  dept: string;
  pubs: number;
  q1: number;
}

export interface OverviewCounts {
  publications: number;
  conferences: number;
  books: number;
  activeFaculty: number;
  pendingFlags: number;
  q1q2Ratio: number;
}

export const adminStatsAPI = {
  getTimeseries: async (): Promise<TimeseriesResponse> => {
    const r = await fetch(`${API_BASE}/admin/stats/timeseries`, { headers: authHeaders() });
    return handleResponse(r);
  },

  getQuartileDistribution: async (): Promise<{ success: boolean; data: QuartileDistItem[] }> => {
    const r = await fetch(`${API_BASE}/admin/stats/quartile-distribution`, { headers: authHeaders() });
    return handleResponse(r);
  },

  getDeptDistribution: async (type: 'publications' | 'conferences' | 'books' = 'publications'): Promise<{ success: boolean; data: DeptDistItem[] }> => {
    const r = await fetch(`${API_BASE}/admin/stats/by-department?type=${type}`, { headers: authHeaders() });
    return handleResponse(r);
  },

  getTopContributors: async (limit = 6): Promise<{ success: boolean; data: TopContributor[] }> => {
    const r = await fetch(`${API_BASE}/admin/stats/top-contributors?limit=${limit}`, { headers: authHeaders() });
    return handleResponse(r);
  },

  getOverviewCounts: async (): Promise<{ success: boolean; data: OverviewCounts }> => {
    const r = await fetch(`${API_BASE}/admin/stats/overview-counts`, { headers: authHeaders() });
    return handleResponse(r);
  },

  deactivateFaculty: async (facultyProfileId: string): Promise<{ success: boolean; message: string }> => {
    const r = await fetch(`${API_BASE}/auth/admin/faculty/${facultyProfileId}/deactivate`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    return handleResponse(r);
  },
};

export default adminStatsAPI;
