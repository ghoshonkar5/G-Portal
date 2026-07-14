import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { RefreshCw, ExternalLink, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const API_BASE_URL = '/api';
const getToken = () => localStorage.getItem('token');

interface ScholarMetrics {
  citations: { all: number | null; recent: number | null };
  hIndex:    { all: number | null; recent: number | null };
  i10Index:  { all: number | null; recent: number | null };
}

interface YearlyCitation {
  year: string;
  citations: number;
}

interface MetricsData {
  metrics: ScholarMetrics;
  yearlyCitations: YearlyCitation[];
  sinceYear: string;
  scholarUserId: string;
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
        <p className="font-medium text-gray-700">{label}</p>
        <p style={{ color: '#101A24' }} className="font-bold">
          {payload[0].value} citations
        </p>
      </div>
    );
  }
  return null;
}

function HoverBar(props: any) {
  const [hovered, setHovered] = useState(false);
  const { x, y, width, height, isLatest } = props;
  const normalColor = isLatest ? '#101A24' : '#99d3cf';
  const hoverColor = '#004a45';
  return (
    <rect
      x={x} y={y} width={width} height={height}
      rx={3} ry={3}
      fill={hovered ? hoverColor : normalColor}
      style={{ cursor: 'pointer', transition: 'fill 0.15s ease' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    />
  );
}

interface ScholarMetricsWidgetProps {
  facultyId?: string;
}

export function ScholarMetricsWidget({ facultyId: propFacultyId }: ScholarMetricsWidgetProps) {
  const { user } = useAuth();
  const facultyId = propFacultyId || user?.facultyId;

  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (silent = false) => {
    if (!facultyId) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/scholar/metrics/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Failed to load Scholar metrics');
        return;
      }
      setData({
        metrics: json.metrics,
        yearlyCitations: json.yearlyCitations || [],
        sinceYear: json.sinceYear,
        scholarUserId: json.scholarUserId,
      });
      setLastSynced(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError('Network error: ' + e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [facultyId]);

  useEffect(() => {
    if (user?.googleScholarUrl) fetchMetrics(true);
  }, [fetchMetrics, user?.googleScholarUrl]);

  if (!user?.googleScholarUrl) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center mb-6">
        <p className="text-sm text-gray-500 mb-1 font-medium">Google Scholar Metrics</p>
        <p className="text-xs text-gray-400">
          Add your Google Scholar URL in{' '}
          <a href="/edit-profile" className="text-[#101A24] hover:underline">Profile Settings</a>{' '}
          to see your citation metrics here.
        </p>
      </div>
    );
  }

  const scholarProfileUrl = data?.scholarUserId
    ? `https://scholar.google.com/citations?user=${data.scholarUserId}`
    : user.googleScholarUrl;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-6">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-white border border-gray-200 text-xs font-bold"
            style={{ color: '#4285F4' }}>
            G
          </div>
          <span className="text-sm font-semibold text-gray-800">Google Scholar Metrics</span>
        </div>
        <div className="flex items-center gap-2">
          {lastSynced && (
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              Updated {lastSynced}
            </span>
          )}
          <button
            onClick={() => fetchMetrics(false)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-50"
            title="Refresh metrics"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <a href={scholarProfileUrl} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            title="Open Scholar profile">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading && !data && (
          <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Fetching from Google Scholar...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-orange-800">{error}</p>
              <button onClick={() => fetchMetrics(false)} className="text-xs text-orange-600 hover:underline mt-1">
                Try again
              </button>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Column headers */}
            <div className="flex mb-1 px-1">
              <div className="flex-1" />
              <div className="w-16 text-center text-[10px] font-medium text-gray-400 uppercase tracking-wide">All</div>
              <div className="w-20 text-center text-[10px] font-medium uppercase tracking-wide" style={{ color: '#101A24' }}>
                Since {data.sinceYear}
              </div>
            </div>

            {/* Metric rows */}
            {[
              { label: 'Citations', key: 'citations' as const },
              { label: 'h-index',   key: 'hIndex'    as const },
              { label: 'i10-index', key: 'i10Index'  as const },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center py-2 border-b border-gray-50 last:border-0">
                <div className="flex-1 text-sm text-gray-700 font-medium">{label}</div>
                <div className="w-16 text-center">
                  <span className="text-lg font-bold text-gray-900">
                    {data.metrics[key].all ?? '—'}
                  </span>
                </div>
                <div className="w-20 text-center">
                  <span className="text-lg font-bold" style={{ color: '#101A24' }}>
                    {data.metrics[key].recent ?? '—'}
                  </span>
                </div>
              </div>
            ))}

            {/* Bar chart */}
            {data.yearlyCitations.length > 0 && (
              <div className="mt-4 mb-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
                  <p className="text-xs font-medium text-gray-500">Citations per year</p>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart
                    data={data.yearlyCitations}
                    margin={{ top: 4, right: 4, left: -20, bottom: 4 }}
                  >
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar
                      dataKey="citations"
                      shape={(props: any) => (
                        <HoverBar {...props} isLatest={props.index === data.yearlyCitations.length - 1} />
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <p className="text-sm text-gray-500">Click refresh to load your Scholar metrics</p>
            <button
              onClick={() => fetchMetrics(false)}
              className="text-sm text-white px-4 py-2 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: '#101A24' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Load Metrics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}