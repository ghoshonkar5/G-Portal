const API_BASE = '/api/placements';

/**
 * Get stored auth token (G-LEARN uses 'token', not 'accessToken')
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Make an authenticated API request
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

// ─── API Methods ──────────────────────────────────────────

export const api = {
  // Auth — only getMe survives; login/register/refresh handled by G-LEARN
  getMe: () => request('/auth/me'),

  // Companies
  getCompanies: () => request('/companies'),
  getCompany: (id) => request(`/companies/${id}`),

  // Submissions
  getSubmissions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/submissions${qs ? `?${qs}` : ''}`);
  },
  searchSubmissions: (q, params = {}) => {
    const qs = new URLSearchParams({ q, ...params }).toString();
    return request(`/submissions/search?${qs}`);
  },
  getSubmission: (id) => request(`/submissions/${id}`),
  createSubmission: (data) =>
    request('/submissions', { method: 'POST', body: JSON.stringify(data) }),
  toggleUpvote: (id) => request(`/submissions/${id}/upvote`, { method: 'POST' }),
  toggleBookmark: (id) => request(`/submissions/${id}/bookmark`, { method: 'POST' }),
  getMySubmissions: () => request('/submissions/mine'),
  deleteSubmission: (id) => request(`/submissions/${id}`, { method: 'DELETE' }),

  // Comments
  createComment: (submissionId, text) =>
    request('/comments', { method: 'POST', body: JSON.stringify({ submissionId, text }) }),

  // Analytics — Public
  getTopicHeatmap: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/topic-heatmap${qs ? `?${qs}` : ''}`);
  },
  getTopicFrequency: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/topic-frequency${qs ? `?${qs}` : ''}`);
  },
  getTopicTrends: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/topic-trends${qs ? `?${qs}` : ''}`);
  },
  getCompanyTimeline: () => request('/analytics/company-timeline'),
  getDifficultyDistribution: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/analytics/difficulty-distribution${qs ? `?${qs}` : ''}`);
  },
  getTopQuestions: (limit = 15) => request(`/analytics/top-questions?limit=${limit}`),

  // Analytics — Admin only (was Moderator)
  getSearchGaps: () => request('/analytics/search-gaps'),
  getSubmissionPipeline: () => request('/analytics/submission-pipeline'),
  getContributorLeaderboard: () => request('/analytics/contributor-leaderboard'),
  getWeeklyActiveUsers: () => request('/analytics/weekly-active-users'),
};

export default api;
