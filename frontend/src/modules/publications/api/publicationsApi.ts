// ── API Configuration ─────────────────────────────────────────────
const API_BASE_URL = '/api'; 
const AUTH_SERVICE_URL = '/api';

const getAuthToken = (): string | null => localStorage.getItem('token');


const authHeaders = () => ({
  'Authorization': `Bearer ${getAuthToken()}`,
});

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`,
});

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
localStorage.removeItem('user');
    }
    return { ...data, success: false, status: response.status };
  }
  return data;
};

// ── Types ─────────────────────────────────────────────────────────
export interface AcademicStats {
  publications: { total: number; thisYear: number; journals: number };
  conferences:  { total: number; international: number; national: number };
  books:        { total: number; books: number; chapters: number };
  citations:    {
    total: number;
    googleCitations: number;
    scopusCitations: number;
    wosCitations: number;
    hIndex: number;
    i10Index: number;
    hIndexSource: 'google' | 'scopus' | 'none';   // ← NEW: tracks which source h-index came from
    i10IndexSource: 'google' | 'scopus' | 'none';  // ← NEW: tracks which source i10 came from
  };
}

// ── Auth API ──────────────────────────────────────────────────────
export const authAPI = {
  login: async (facultyId: string, password: string) => {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facultyId, password }),
    });
    const data = await handleResponse(response);
    if (!data.success || !data.token) {
      return data;
    }

    // Auth Service only returns the basics. Store the token, then pull
    // the full profile (research area, URLs, etc.) from our own backend.
    localStorage.setItem('token', data.token);

    const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const meData = await handleResponse(meResponse);

    if (meData.success && meData.user) {
      localStorage.setItem('user', JSON.stringify(meData.user));
      return { success: true, token: data.token, user: meData.user };
    }

    // Fallback if the profile fetch fails for some reason
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  register: async (userData: {
    email: string; password: string; facultyId: string; name: string;
    department?: string; designation?: string; mobile?: string; researchArea?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await handleResponse(response);
    if (data.success && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getMe: async () => {
    const token = getAuthToken();
    if (!token) return { success: false, message: 'No token found' };
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: authHeaders(),
      });
      return handleResponse(response);
    } catch (error) {
      localStorage.removeItem('token');
localStorage.removeItem('user');
      return { success: false, message: String(error) };
    }
  },

  updateExtendedProfile: async (data: {
    officeRoom?: string | null;
    officeHours?: string | null;
    coursesTaught?: string | null;
    roles?: string | null;
    linkedinUrl?: string | null;
    websiteUrl?: string | null;
    yearsOfExperience?: number | null;
    profilePhoto?: string | null;
    mobile?: string | null;
    researchArea?: string | null;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateProfileUrls: async (urls: {
    googleScholarUrl?: string;
    scopusUrl?: string;
    wosUrl?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile-urls`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(urls),
    });
    return handleResponse(response);
  },

  getAllFaculty: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/faculty`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },
};

// ── Publications API ──────────────────────────────────────────────
export const publicationsAPI = {
  getAll: async (filters?: { academicYear?: string; quartile?: string }) => {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${API_BASE_URL}/publications?${params}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  getByFaculty: async (facultyId: string) => {
    const response = await fetch(`${API_BASE_URL}/publications/faculty/${facultyId}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  getById: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/publications`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/publications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  getStats: async (facultyId: string) => {
    const response = await fetch(`${API_BASE_URL}/publications/stats/${facultyId}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },
};

// ── Conferences API ───────────────────────────────────────────────
export const conferencesAPI = {
  getAll: async (filters?: { academicYear?: string; type?: string }) => {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${API_BASE_URL}/conferences?${params}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  getByFaculty: async (facultyId: string) => {
    const response = await fetch(`${API_BASE_URL}/conferences/faculty/${facultyId}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/conferences`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/conferences/${id}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/conferences/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(response);
  },
};

// ── Books API ─────────────────────────────────────────────────────
export const booksAPI = {
  getAll: async (filters?: { academicYear?: string; type?: string }) => {
    const params = new URLSearchParams(filters as any);
    const response = await fetch(`${API_BASE_URL}/books?${params}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  getByFaculty: async (facultyId: string) => {
    const response = await fetch(`${API_BASE_URL}/books/faculty/${facultyId}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/books`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (id: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/books/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(response);
  },
};

// ── getFacultyData: aggregates stats from all three tables ────────
const getFacultyData = async (facultyId: string, _token: string) => {
  try {
    if (!facultyId) throw new Error('Faculty ID not found');

    const token = getAuthToken();

    // ── FIX: Fetch publications, conferences, books, Scholar metrics,
    //         AND Scopus metrics all in parallel.
    //         Scopus metrics come from /api/scopus/metrics (author-level,
    //         same endpoint ScopusMetricsWidget uses) — NOT per-paper sums.
    const [pubs, confs, books, scholarRes, scopusRes] = await Promise.all([
      publicationsAPI.getByFaculty(facultyId),
      conferencesAPI.getByFaculty(facultyId),
      booksAPI.getByFaculty(facultyId),
      fetch(`${API_BASE_URL}/scholar/metrics/${facultyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => ({ success: false })),
      // ← NEW: fetch the same author-level Scopus metrics the widget uses
      fetch(`${API_BASE_URL}/scopus/metrics/${facultyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => ({ success: false })),
    ]);

    const publications: any[] = pubs.data  || [];
    const conferences:  any[] = confs.data || [];
    const booksData:    any[] = books.data || [];

    // ── Google Scholar metrics (from SerpAPI, saved to faculty table) ──
    const scholarMetrics  = scholarRes?.success ? scholarRes.metrics : null;
    const googleCitations = scholarMetrics?.citations?.all ??
      publications.reduce((s: number, p: any) => s + (p.googleCitations || 0), 0);

    // ── FIX: Scopus citation count — use author-level count from faculty table
    //         (scopus_citation_count = 24), NOT per-paper sum (was wrongly 5).
    //         Falls back to per-paper sum only if the endpoint fails entirely.
    const scopusCitations: number = scopusRes?.success
      ? (scopusRes.citationCount ?? 0)                          // ← author-level "24"
      : publications.reduce(
          (s: number, p: any) => s + (p.scopusCitations || 0), 0  // fallback
        );

    // ── WoS: still per-paper (no author-level WoS endpoint yet) ──
    const wosCitations = publications.reduce(
      (s: number, p: any) => s + (p.wosCitations || 0), 0
    );

    // ── H-Index: prefer Google Scholar (all-time), fall back to Scopus ──
    const hIndexSource: 'google' | 'scopus' | 'none' =
      scholarMetrics?.hIndex?.all != null ? 'google'
      : scopusRes?.success && (scopusRes.hIndex ?? 0) > 0 ? 'scopus'
      : 'none';

    const hIndex: number =
      hIndexSource === 'google'  ? (scholarMetrics!.hIndex.all ?? 0)
      : hIndexSource === 'scopus' ? (scopusRes.hIndex ?? 0)
      : 0;

    // ── i10-Index: Google Scholar only (Scopus doesn't provide i10) ──
    const i10IndexSource: 'google' | 'scopus' | 'none' =
      scholarMetrics?.i10Index?.all != null ? 'google' : 'none';

    const i10Index: number = scholarMetrics?.i10Index?.all ?? 0;

    const totalCitations = googleCitations + scopusCitations + wosCitations;

    // "This year" pubs
    const currentYear = new Date().getFullYear();
    const thisYearPubs = publications.filter((p: any) => {
      if (!p.monthYear) return false;
      const parts = p.monthYear.trim().split(' ');
      return parseInt(parts[parts.length - 1]) === currentYear;
    });

    const stats: AcademicStats = {
      publications: {
        total:    publications.length,
        thisYear: thisYearPubs.length,
        journals: publications.length,
      },
      conferences: {
        total:         conferences.length,
        international: conferences.filter((c: any) => c.type === 'International').length,
        national:      conferences.filter((c: any) => c.type === 'National').length,
      },
      books: {
        total:    booksData.length,
        books:    booksData.filter((b: any) => b.type === 'Book').length,
        chapters: booksData.filter((b: any) => b.type === 'Book Chapter').length,
      },
      citations: {
        total: totalCitations,
        googleCitations,
        scopusCitations,   // ← now correct author-level count
        wosCitations,
        hIndex,
        i10Index,
        hIndexSource,      // ← new: 'google' | 'scopus' | 'none'
        i10IndexSource,    // ← new: 'google' | 'none'
      },
    };

    return { success: true, data: { academicStats: stats } };
  } catch (error) {
    console.error('[getFacultyData] error:', error);
    return { success: false, error: String(error) };
  }
};

const syncData = async (_userId: string, _token: string) => {
  return { success: true, message: 'Sync completed successfully' };
};

// ── KRC API ───────────────────────────────────────────────────────
export const krcAPI = {
  getFacultyKRC: async (facultyId: string) => {
    const response = await fetch(`${API_BASE_URL}/krc/faculty/${facultyId}`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/krc/stats`, {
      headers: authHeaders(),
    });
    return handleResponse(response);
  },

  importCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('csv', file);
    const response = await fetch(`${API_BASE_URL}/krc/import-csv`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  clearAll: async () => {
    const response = await fetch(`${API_BASE_URL}/krc/clear`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(response);
  },
};

// ── Main export ───────────────────────────────────────────────────
export const api = {
  auth:         authAPI,
  publications: publicationsAPI,
  conferences:  conferencesAPI,
  books:        booksAPI,
  krc:          krcAPI,
  getFacultyData,
  syncData,
};

export default api;