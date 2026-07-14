import { useState, useEffect, useRef } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const API_BASE_URL = '/api';
const getToken = () => localStorage.getItem('token');

interface ScopusMetrics {
  citationCount: number;
  hIndex: number;
  docCount: number;
  recentCitations?: number;
  recentHIndex?: number;
  recentDocCount?: number;
}

interface YearlyEntry {
  year: string;
  citations: number;
  docs: number;
}

interface ScopusMetricsWidgetProps {
  facultyId?: string;
}

export function ScopusMetricsWidget({ facultyId: propFacultyId }: ScopusMetricsWidgetProps) {
  const { user } = useAuth();
  const facultyId = propFacultyId || user?.facultyId;

  const [metrics, setMetrics]       = useState<ScopusMetrics | null>(null);
  const [loading, setLoading]       = useState(true);
  const [yearlyData, setYearlyData] = useState<YearlyEntry[]>([]);

  const chartRef      = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<any>(null);

  const sinceYear = new Date().getFullYear() - 4;

  // ── Fetch metrics ────────────────────────────────────────────
  const fetchMetrics = async () => {
    if (!facultyId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/scopus/metrics/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setMetrics({
          citationCount:   data.citationCount   ?? 0,
          hIndex:          data.hIndex          ?? 0,
          docCount:        data.docCount        ?? 0,
          recentCitations: data.recentCitations ?? undefined,
          recentHIndex:    data.recentHIndex    ?? undefined,
          recentDocCount:  data.recentDocCount  ?? undefined,
        });
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  };

  // ── Fetch yearly chart data ───────────────────────────────────
  const fetchYearlyData = async () => {
    if (!facultyId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/scopus/yearly-stats/${facultyId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.yearly) && data.yearly.length > 0) {
          setYearlyData(data.yearly);
          return;
        }
      }
    } catch { /* endpoint may not exist yet */ }
    setYearlyData([]);
  };

  useEffect(() => {
    fetchMetrics();
    fetchYearlyData();
  }, [facultyId]);

  // ── Build Chart.js ─────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const build = async () => {
      try {
        const { Chart, registerables } = await import('chart.js');
        Chart.register(...registerables);

        if (chartInstance.current) {
          chartInstance.current.destroy();
          chartInstance.current = null;
        }
        const ctx = chartRef.current?.getContext('2d');
        if (!ctx) return;

        let labels: string[];
        let docData: number[];
        let citeData: number[];

        if (yearlyData.length > 0) {
          const curYear   = new Date().getFullYear();
          const firstYear = parseInt(yearlyData[0].year);
          const lastYear  = Math.max(
            parseInt(yearlyData[yearlyData.length - 1].year),
            curYear
          );

          const byYr: Record<string, YearlyEntry> = {};
          yearlyData.forEach(d => { byYr[d.year] = d; });

          const filled: YearlyEntry[] = [];
          for (let y = firstYear; y <= lastYear; y++) {
            filled.push(byYr[String(y)] ?? { year: String(y), docs: 0, citations: 0 });
          }

          labels  = filled.map(d => d.year);
          docData = filled.map(d => d.docs);

          let running = 0;
          citeData = filled.map(d => {
            running += d.citations;
            return running;
          });
        } else {
          const cur = new Date().getFullYear();
          labels   = Array.from({ length: 6 }, (_, i) => String(cur - 5 + i));
          docData  = labels.map(() => 0);
          citeData = labels.map(() => 0);
        }

        const tickLabels = labels.map((l, i) =>
          i === 0 || i === labels.length - 1 ? l : ''
        );

        // ── Teal — matches Scholar widget exactly ─────────────────
        const TEAL      = '#0d9488';
        const DARK_LINE = '#1a1a2e';

        chartInstance.current = new Chart(ctx, {
          data: {
            labels: tickLabels,
            datasets: [
              {
                type: 'bar' as const,
                label: 'Documents',
                data: docData,
                backgroundColor: TEAL,
                hoverBackgroundColor: '#0f766e',
                yAxisID: 'yDocs',
                order: 2,
                barPercentage: 0.5,
                categoryPercentage: 0.6,
                borderRadius: 2,
              },
              {
                type: 'line' as const,
                label: 'Cumulative Citations',
                data: citeData,
                borderColor: DARK_LINE,
                backgroundColor: 'transparent',
                borderDash: [4, 3],
                borderWidth: 1.8,
                pointBackgroundColor: DARK_LINE,
                pointBorderColor: DARK_LINE,
                pointBorderWidth: 0,
                pointRadius: 4,
                pointHoverRadius: 5,
                yAxisID: 'yCites',
                order: 1,
                tension: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { mode: 'index', intersect: false },
            },
            scales: {
              x: {
                ticks: {
                  font: { size: 11 },
                  color: '#6b7280',
                  maxRotation: 0,
                  autoSkip: false,
                },
                grid:   { display: false },
                border: { display: false },
              },
              yDocs: {
                position: 'left' as const,
                title: {
                  display: true,
                  text: 'Documents',
                  font: { size: 9 },
                  color: '#9ca3af',
                },
                ticks: {
                  font: { size: 9 },
                  color: '#9ca3af',
                  stepSize: 1,
                  precision: 0,
                  maxTicksLimit: 5,
                },
                grid:   { color: 'rgba(0,0,0,0.05)' },
                border: { display: false },
                min: 0,
              },
              yCites: {
                position: 'right' as const,
                title: {
                  display: true,
                  text: 'Cumulative Citations',
                  font: { size: 9 },
                  color: '#9ca3af',
                },
                ticks: {
                  font: { size: 9 },
                  color: '#9ca3af',
                  precision: 0,
                  maxTicksLimit: 5,
                },
                grid:   { display: false },
                border: { display: false },
                min: 0,
              },
            },
          },
        });
      } catch (e) {
        console.warn('[ScopusMetricsWidget] Chart.js error:', e);
      }
    };

    build();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [loading, yearlyData]);

  const scopusProfileUrl = user?.scopusUrl || '';

  // ── Skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 animate-pulse">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-6 h-6 rounded bg-orange-100" />
          <div className="h-4 w-36 rounded bg-gray-100" />
        </div>
        <div className="flex justify-end gap-8 mb-2 pr-0.5">
          <div className="h-3 w-5 rounded bg-gray-100" />
          <div className="h-3 w-20 rounded bg-[#E5DDC6]/30" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex justify-between items-center py-3 border-t border-gray-50">
            <div className="h-3.5 w-20 rounded bg-gray-100" />
            <div className="flex gap-8">
              <div className="h-4 w-8 rounded bg-gray-100" />
              <div className="h-4 w-8 rounded bg-[#E5DDC6]/30" />
            </div>
          </div>
        ))}
        <div className="mt-5 h-44 rounded-lg bg-gray-50" />
      </div>
    );
  }

  const rows = [
    { label: 'Citations', allValue: metrics?.citationCount ?? 0, recentValue: metrics?.recentCitations },
    { label: 'h-index',   allValue: metrics?.hIndex        ?? 0, recentValue: metrics?.recentHIndex },
    { label: 'Documents', allValue: metrics?.docCount      ?? 0, recentValue: metrics?.recentDocCount },
  ];

  // ── Teal accent — matches Scholar's "Since YYYY" column ───────
  const ACCENT = '#0d9488';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#E87722' }}
          >
            <span className="text-white font-bold text-xs leading-none select-none">S</span>
          </div>
          <span className="text-sm font-semibold text-gray-800">Scopus Metrics</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchMetrics(); fetchYearlyData(); }}
            title="Refresh"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {scopusProfileUrl && (
            <a
              href={scopusProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Scopus profile"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex justify-end gap-8 mb-1 pr-0.5">
        <span className="text-xs text-gray-400 w-8 text-right">All</span>
        <span className="text-xs font-semibold w-20 text-right" style={{ color: ACCENT }}>
          Since {sinceYear}
        </span>
      </div>

      {/* Metric rows */}
      {rows.map(({ label, allValue, recentValue }) => (
        <div key={label} className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <div className="flex gap-8 items-center">
            <span className="text-sm text-gray-700 tabular-nums w-8 text-right">{allValue}</span>
            <span
              className="text-sm font-semibold w-20 text-right tabular-nums"
              style={{ color: ACCENT }}
            >
              {recentValue !== undefined ? recentValue : allValue}
            </span>
          </div>
        </div>
      ))}

      {/* Chart */}
      <div className="mt-5">
        <div className="flex items-center gap-1.5 mb-3">
          <svg width="16" height="14" viewBox="0 0 16 14" fill="none">
            <path
              d="M1 11 L4 7 L7 9 L10 4 L13 6 L15 4"
              stroke="#6b7280" strokeWidth="1.4" fill="none"
              strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M12 4 L15 4 L15 7"
              stroke="#6b7280" strokeWidth="1.4" fill="none"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs text-gray-500">Documents per year &amp; cumulative citations</span>
        </div>

        <div style={{ position: 'relative', width: '100%', height: '160px' }}>
          <canvas ref={chartRef} />
        </div>

        {/* Legend */}
        <div className="flex gap-5 mt-2.5">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: ACCENT }}
            />
            Documents
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <svg width="18" height="10" viewBox="0 0 18 10">
              <line x1="0" y1="5" x2="5" y2="5" stroke="#1a1a2e" strokeWidth="1.8" strokeDasharray="4 3" />
              <line x1="7" y1="5" x2="12" y2="5" stroke="#1a1a2e" strokeWidth="1.8" strokeDasharray="4 3" />
              <circle cx="9" cy="5" r="3" fill="#1a1a2e" />
            </svg>
            Cumulative Citations
          </span>
        </div>

        {yearlyData.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-3">
            Sync from Scopus to populate chart data.
          </p>
        )}
      </div>
    </div>
  );
}