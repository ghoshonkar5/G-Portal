// ═══════════════════════════════════════════════════════════════════
// University Research Admin — SVG Charts (no library dependencies)
// Ported from reference charts.jsx → typed TSX
// ═══════════════════════════════════════════════════════════════════

import { useRef, useState, useEffect, useMemo } from 'react';
import { AdminAvatar } from './ui-kit';

// ── TimeAreaChart — multi-series line/area ────────────────────────
export interface TimeSeriesData {
  years: string[];
  series: { name: string; color: string; values: number[] }[];
}

export function TimeAreaChart({ data, height = 220 }: { data: TimeSeriesData; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padL = 36, padR = 16, padT = 12, padB = 26;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;
  const N = data.years.length;
  const allMax = Math.max(...data.series.flatMap(s => s.values), 1);
  const yMax = Math.ceil(allMax / 100) * 100 || 100;
  const stepX = innerW / Math.max(1, N - 1);

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((yMax / ticks) * i));

  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={height} className="overflow-visible">
        <defs>
          {data.series.map((s, i) => (
            <linearGradient key={i} id={`tac-${i}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        {/* horizontal grid */}
        {yTicks.map((t, i) => {
          const y = padT + innerH - (t / yMax) * innerH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={padL + innerW} y2={y} stroke="rgba(11,31,29,0.06)" strokeDasharray="2 4" />
              <text x={padL - 8} y={y + 4} fontSize="10" textAnchor="end" fill="#94aca8" className="tnum">{t}</text>
            </g>
          );
        })}

        {/* x labels */}
        {data.years.map((yr, i) => {
          const x = padL + i * stepX;
          return <text key={yr} x={x} y={height - 6} fontSize="10" textAnchor="middle" fill="#94aca8">{yr}</text>;
        })}

        {/* lines + areas */}
        {data.series.map((s, idx) => {
          const pts = s.values.map((v, i) => [padL + i * stepX, padT + innerH - (v / yMax) * innerH]);
          const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          const area = `${path} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`;
          return (
            <g key={idx}>
              <path d={area} fill={`url(#tac-${idx})`} />
              <path d={path} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.5}
                  fill="white" stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div className="flex items-center gap-4 mt-3 px-1">
        {data.series.map(s => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
            <span className="text-xs text-slate-600 font-medium">{s.name}</span>
            <span className="text-xs text-slate-400 tnum">{(s.values[s.values.length - 1] || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── QuartileDonut ─────────────────────────────────────────────────
export interface QuartileData {
  label: string; value: number; color: string;
}

export function QuartileDonut({ data, size = 200 }: { data: QuartileData[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 18;
  const c = 2 * Math.PI * r;
  const center = size / 2;
  let acc = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="overflow-visible -rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(11,31,29,0.06)" strokeWidth={20} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = c * frac;
          const gap = 2;
          const seg = (
            <circle key={i} cx={center} cy={center} r={r}
              fill="none" stroke={d.color} strokeWidth={20}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
              strokeDashoffset={-acc}
              style={{ transition: 'stroke-dashoffset .6s ease' }} />
          );
          acc += len;
          return seg;
        })}
        <g transform={`rotate(90 ${center} ${center})`}>
          <text x={center} y={center - 4} fontSize="13" textAnchor="middle" fill="#94aca8" className="tnum">Total</text>
          <text x={center} y={center + 18} fontSize="24" fontWeight="700" textAnchor="middle" fill="#0b1f1d" className="tnum">{total.toLocaleString()}</text>
        </g>
      </svg>
      <div className="flex-1 space-y-2.5">
        {data.map(d => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={d.label} className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
              <span className="text-xs font-semibold text-slate-700 w-7">{d.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
              </div>
              <span className="text-xs text-slate-500 tnum w-10 text-right">{pct}%</span>
              <span className="text-xs font-semibold text-slate-900 tnum w-12 text-right">{d.value.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FacultyBars — horizontal top-contributor bars ─────────────────
export interface FacultyBarData {
  name: string; dept: string; pubs: number; q1: number;
}

export function FacultyBars({ data, onSelect }: {
  data: FacultyBarData[]; onSelect?: (f: FacultyBarData) => void;
}) {
  const max = Math.max(...data.map(d => d.pubs), 1);
  return (
    <div className="space-y-2.5">
      {data.map((f, i) => {
        const w = (f.pubs / max) * 100;
        const q1w = f.pubs > 0 ? (f.q1 / f.pubs) * 100 : 0;
        return (
          <button key={f.name} onClick={() => onSelect?.(f)} className="w-full text-left group">
            <div className="flex items-center gap-3">
              <span className="w-5 text-xs font-bold text-slate-400 tnum">{String(i + 1).padStart(2, '0')}</span>
              <AdminAvatar name={f.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-end justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 truncate group-hover:text-[var(--brand-700)] transition-colors">{f.name}</p>
                    <p className="text-[11px] text-slate-500">{f.dept}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-900 tnum">{f.pubs}</p>
                    <p className="text-[10px] text-emerald-600 font-medium tnum">{f.q1} Q1</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden relative">
                  <div className="h-full rounded-full" style={{ width: `${w}%`, background: 'linear-gradient(90deg, #101A24, #4cb19f)' }} />
                  <div className="absolute top-0 left-0 h-full rounded-full"
                    style={{ width: `${(w * q1w) / 100}%`, background: '#16a34a', opacity: 0.85 }} />
                </div>
              </div>
            </div>
          </button>
        );
      })}
      <div className="flex items-center gap-4 pt-2 mt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-xs text-slate-500">Q1 share</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(90deg,#101A24,#4cb19f)' }} />
          <span className="text-xs text-slate-500">Total publications</span>
        </div>
      </div>
    </div>
  );
}

// ── VBarChart — vertical bar chart ────────────────────────────────
export interface DeptDistData {
  dept: string; value: number;
}

export function VBarChart({ data, height = 160 }: { data: DeptDistData[]; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(480);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const bw = Math.max(18, (w - 16) / data.length - 10);

  return (
    <div ref={ref} className="w-full">
      <svg width={w} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="vbar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#101A24" />
            <stop offset="100%" stopColor="#4cb19f" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 36);
          const x = 8 + i * ((w - 16) / data.length) + ((w - 16) / data.length - bw) / 2;
          const y = height - 22 - h;
          return (
            <g key={d.dept}>
              <rect x={x} y={y} width={bw} height={h} rx={4} fill="url(#vbar)" />
              <text x={x + bw / 2} y={y - 4} fontSize="10" textAnchor="middle" fill="#0b1f1d" fontWeight="600" className="tnum">{d.value}</text>
              <text x={x + bw / 2} y={height - 6} fontSize="10" textAnchor="middle" fill="#94aca8">{d.dept}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
