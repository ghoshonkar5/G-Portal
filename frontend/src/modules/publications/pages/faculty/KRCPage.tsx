
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { UniversityLogo } from "../../components/UniversityLogo";
import { FilterDropdown } from "../../components/FilterDropdown";
import { useAuth } from "../../../../context/AuthContext";
import { api } from "../../api/publicationsApi";
import { generateAcademicYears, parseAcademicYear } from "../../utils/academicYears";
import {
  ArrowLeft, Search, FileDown, Info,
  ChevronDown, ChevronUp, Database
} from "lucide-react";

// ── KRC data shape (matches krcController getKRCForFaculty response) ──────────
interface KRCMatch {
  subjectArea:  string | null;
  asjcCode:     string | null;
  citationCount: number | null;
  percentCited: number | null;
  citeScore:    number | null;
  snip:         number | null;
  sjr:          number | null;
  percentile:   number | null;
  rank:         number | null;
  rankOutOf:    number | null;
  publisher:    string | null;
  quartile:     number | null;    // 1 | 2 | 3 | 4 as integer from DB
  top10Percent: boolean | null;
}

interface KRCPublication {
  pubId:            string;
  title:            string;
  journal:          string;
  authors:          string | string[];
  positionOfAuthor: string | null;
  monthYear:        string | null;
  academicYear:     string | null;
  krcMatches:       KRCMatch[];
  bestMatch:        KRCMatch | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (val: number | string | null | undefined, suffix = '') =>
  val === null || val === undefined || val === '' ? '—' : `${val}${suffix}`;

const fmtAuthors = (authors: string | string[] | null | undefined) => {
  if (!authors) return '—';
  return Array.isArray(authors) ? authors.join(', ') : authors;
};

// quartile from DB is integer 1-4
const quartileLabel = (q: number | null) => {
  if (!q) return null;
  return `Q${q}`;
};

const quartileBgColor: Record<number, string> = {
  1: '#16a34a',
  2: '#2563eb',
  3: '#f97316',
  4: '#ef4444',
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export function KRCPublicationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<KRCPublication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const allAcademicYears = generateAcademicYears();

  // ── Fetch KRC data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.facultyId) return;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await api.krc.getFacultyKRC(user.facultyId);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.message || 'Failed to load KRC data');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load KRC data');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user?.facultyId]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    return data.filter(pub => {
      const matchSearch = !searchTerm ||
        (pub.title || '').toLowerCase().includes(s) ||
        (pub.journal || '').toLowerCase().includes(s) ||
        fmtAuthors(pub.authors).toLowerCase().includes(s);

      const matchYear = selectedAcademicYear === 'all' ||
        parseAcademicYear(pub.academicYear || '') === selectedAcademicYear;

      return matchSearch && matchYear;
    });
  }, [data, searchTerm, selectedAcademicYear]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = filteredData.length;
    const matched = filteredData.filter(p => p.krcMatches.length > 0).length;
    return { total, matched, unmatched: total - matched };
  }, [filteredData]);

  // ── Expand toggle ─────────────────────────────────────────────────────────
  const toggleExpand = (pubId: string) =>
    setExpandedIds(prev => ({ ...prev, [pubId]: !prev[pubId] }));

  // ── Export CSV ────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (filteredData.length === 0) return;

    const esc = (v: any) => {
      if (v === null || v === undefined) return '""';
      return `"${String(v).replace(/"/g, '""')}"`;
    };

    const headers = [
      'Title', 'Journal', 'Authors', 'Author Position', 'Month Year', 'Academic Year',
      'Citation Count', 'Percent Cited', 'CiteScore', 'SNIP', 'SJR',
      'Scopus ASJC Codes', 'Scopus Sub-Subject Areas',
      'Percentile', 'Rank', 'Rank Out Of', 'Publisher', 'Quartile', 'Top 10%',
    ];

    const rows = filteredData.map(pub => {
      const m = pub.bestMatch;
      const isMatch = pub.krcMatches.length > 0;
      const asjcCodes  = pub.krcMatches.map(k => k.asjcCode  || '').filter(Boolean).join(' ; ');
      const subjAreas  = pub.krcMatches.map(k => k.subjectArea || '').filter(Boolean).join(' ; ');
      const rankStr    = m?.rank && m?.rankOutOf ? `${m.rank} / ${m.rankOutOf}` : fmt(m?.rank);

      return [
        esc(pub.title),
        esc(pub.journal),
        esc(fmtAuthors(pub.authors)),
        esc(pub.positionOfAuthor),
        esc(pub.monthYear),
        esc(pub.academicYear),
        isMatch ? esc(m?.citationCount ?? '—') : esc('—'),
        isMatch ? esc(m?.percentCited  != null ? `${m.percentCited}%` : '—') : esc('—'),
        isMatch ? esc(m?.citeScore     ?? '—') : esc('—'),
        isMatch ? esc(m?.snip          ?? '—') : esc('—'),
        isMatch ? esc(m?.sjr           ?? '—') : esc('—'),
        isMatch ? esc(asjcCodes  || '—') : esc('—'),
        isMatch ? esc(subjAreas  || '—') : esc('—'),
        isMatch ? esc(m?.percentile    ?? '—') : esc('—'),
        isMatch ? esc(m?.rank          ?? '—') : esc('—'),
        isMatch ? esc(m?.rankOutOf     ?? '—') : esc('—'),
        isMatch ? esc(m?.publisher     ?? '—') : esc('—'),
        isMatch ? esc(quartileLabel(m?.quartile ?? null) ?? '—') : esc('Not in KRC'),
        isMatch ? esc(m?.top10Percent ? 'Yes' : 'No') : esc('—'),
      ].join(',');
    });

    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `KRC_Publications_${user?.facultyId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCF7] via-[#F8F6F0] to-[#E5DDC6]/20">

      {/* ── Header ── */}
      <header
        style={{
          backgroundColor: '#101A24',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
          position: 'relative',
          zIndex: 10,
        }}
        className="shadow-md"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Left */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => navigate('/publications/publications')}

                className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />Back
              </button>
              <div className="w-px h-5 bg-white/20" />
              <UniversityLogo className="w-8 h-8" />
              <h1 className="text-base font-semibold text-white">KRC Publications View</h1>
            </div>

            {/* Right */}
            <Button
              onClick={handleExport}
              disabled={filteredData.length === 0}
              className="text-white border text-sm h-8 px-3 whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <FileDown className="w-3.5 h-3.5 mr-1.5" />Export CSV
            </Button>

          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ position: 'relative', zIndex: 0 }}
      >

        {/* ── Info Banner ── */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#E5DDC6] bg-[#E5DDC6]/30 px-4 py-3 shadow-sm">
          <Info className="w-4 h-4 text-[#101A24] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#101A24] leading-relaxed">
            Metrics shown here are sourced from the <strong>KRC Scopus list</strong> uploaded by the
            administrator. Publications are matched by journal title. If a journal is not found in
            the KRC list, KRC metric columns will display <strong>—</strong>. These values may differ
            from the metrics shown in the main Publications portal.
          </p>
        </div>

        {/* ── Controls ── */}
        <div
          className="mb-6 rounded-xl bg-white/95 shadow-lg border-0 p-5"
          style={{ overflow: 'visible', position: 'relative', zIndex: 5 }}
        >
          <div
            className="flex flex-wrap items-center gap-3"
            style={{ overflow: 'visible' }}
          >
            <div style={{ overflow: 'visible', position: 'relative', zIndex: 10 }}>
              <FilterDropdown
                selectedValue={selectedAcademicYear}
                onValueChange={setSelectedAcademicYear}
                options={allAcademicYears}
                placeholder="All Academic Years"
              />
            </div>
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by title, journal, or author..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:border-[#101A24]/50 focus:ring-[#101A24]/20"
              />
            </div>
            <span className="text-xs text-gray-500 ml-auto">
              {filteredData.length} publication{filteredData.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div
          className="rounded-xl bg-white/95 shadow-lg overflow-hidden"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Card header */}
          <div className="bg-gradient-to-r from-[#101A24] to-[#16222E] text-white px-6 py-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            <span className="font-semibold">KRC Journal Metrics</span>
            <span className="ml-auto text-sm bg-white/20 px-2 py-1 rounded-full">
              {filteredData.length} records
            </span>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-20 text-gray-500">
              <div className="w-5 h-5 border-2 border-[#101A24] border-t-transparent rounded-full animate-spin" />
              Loading KRC metrics...
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="text-center py-16 text-red-500 text-sm">{error}</div>
          )}

          {/* Empty */}
          {!isLoading && !error && filteredData.length === 0 && (
            <div className="text-center py-16">
              <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No publications found</p>
              <p className="text-sm text-gray-400 mt-1">
                {data.length === 0
                  ? 'No publications in your portfolio yet.'
                  : 'Try adjusting the search or year filter.'}
              </p>
            </div>
          )}

          {/* Table */}
          {!isLoading && !error && filteredData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">

                {/* ── Table Head ── */}
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {/* DB columns */}
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[280px]">Title</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[180px]">Journal</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[180px]">Authors</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[120px]">Author Position</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[110px]">Month Year</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[110px]">Academic Year</th>
                    {/* KRC metric columns */}
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right min-w-[100px]">Citation Count</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right min-w-[90px]">% Cited</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right min-w-[90px]">CiteScore</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right min-w-[70px]">SNIP</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right min-w-[70px]">SJR</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[120px]">ASJC Code</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[220px]">Sub-Subject Area</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-right min-w-[90px]">Percentile</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center min-w-[110px]">Rank</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 min-w-[140px]">Publisher</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center min-w-[90px]">Quartile</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center min-w-[80px]">Top 10%</th>
                  </tr>
                </thead>

                {/* ── Table Body ── */}
                <tbody className="divide-y divide-gray-50">
                  {filteredData.map(pub => {
                    const m          = pub.bestMatch;
                    const isMatch    = pub.krcMatches.length > 0;
                    const isExpanded = expandedIds[pub.pubId] || false;
                    const hasMulti   = pub.krcMatches.length > 1;
                    const qLabel     = quartileLabel(m?.quartile ?? null);
                    const qColor     = m?.quartile ? quartileBgColor[m.quartile] : undefined;

                    return (
                      <tr
                        key={pub.pubId}
                        className="hover:bg-gray-50/60 transition-colors align-top"
                      >
                        {/* Title */}
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-normal leading-snug">
                          {pub.title}
                        </td>

                        {/* Journal */}
                        <td className="px-4 py-3 text-gray-600 whitespace-normal leading-snug">
                          {pub.journal || '—'}
                        </td>

                        {/* Authors */}
                        <td className="px-4 py-3 text-gray-600 whitespace-normal leading-snug">
                          {fmtAuthors(pub.authors)}
                        </td>

                        {/* Author Position */}
                        <td className="px-4 py-3 text-gray-600">
                          {pub.positionOfAuthor || '—'}
                        </td>

                        {/* Month Year */}
                        <td className="px-4 py-3 text-gray-600">
                          {pub.monthYear || '—'}
                        </td>

                        {/* Academic Year */}
                        <td className="px-4 py-3 text-gray-600">
                          {pub.academicYear || '—'}
                        </td>

                        {/* ── KRC Metrics — all use bestMatch ── */}
                        <td className="px-4 py-3 text-right text-gray-700 font-medium">
                          {isMatch ? fmt(m?.citationCount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-medium">
                          {isMatch && m?.percentCited != null ? `${m.percentCited}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-medium">
                          {isMatch ? fmt(m?.citeScore) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-medium">
                          {isMatch ? fmt(m?.snip) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 font-medium">
                          {isMatch ? fmt(m?.sjr) : '—'}
                        </td>

                        {/* ── ASJC Code (expandable, mirrors sub-subject) ── */}
                        <td className="px-4 py-3 align-top">
                          {isMatch && pub.krcMatches.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="inline-block bg-[#E5DDC6]/30 text-[#101A24] border border-[#E5DDC6] px-2 py-0.5 rounded text-[11px] font-medium">
                                {pub.krcMatches[0].asjcCode || '—'}
                              </span>
                              {isExpanded && pub.krcMatches.slice(1).map((k, i) => (
                                <div key={i}>
                                  <span className="inline-block bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                    {k.asjcCode || '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : '—'}
                        </td>

                        {/* ── Sub-Subject Area (expandable) ── */}
                        <td className="px-4 py-3 align-top whitespace-normal">
                          {isMatch && pub.krcMatches.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="inline-block bg-[#E5DDC6]/30 text-[#101A24] border border-[#E5DDC6] px-2 py-0.5 rounded text-[11px] font-medium">
                                {pub.krcMatches[0].subjectArea || '—'}
                              </span>
                              {hasMulti && (
                                <div className="mt-1">
                                  {isExpanded ? (
                                    <>
                                      <div className="space-y-1.5 mb-1.5">
                                        {pub.krcMatches.slice(1).map((k, i) => (
                                          <div key={i}>
                                            <span className="inline-block bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded text-[11px] font-medium">
                                              {k.subjectArea || '—'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      <button
                                        onClick={() => toggleExpand(pub.pubId)}
                                        className="flex items-center gap-1 text-[11px] text-[#101A24] hover:text-[#101A24] font-medium transition-colors"
                                      >
                                        <ChevronUp className="w-3 h-3" />Show less
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => toggleExpand(pub.pubId)}
                                      className="flex items-center gap-1 text-[11px] text-[#101A24] hover:text-[#101A24] font-medium transition-colors"
                                    >
                                      <ChevronDown className="w-3 h-3" />
                                      +{pub.krcMatches.length - 1} more
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </td>

                        {/* Percentile */}
                        <td className="px-4 py-3 text-right text-gray-700">
                          {isMatch ? fmt(m?.percentile) : '—'}
                        </td>

                        {/* Rank */}
                        <td className="px-4 py-3 text-center text-gray-700 whitespace-nowrap">
                          {isMatch
                            ? (m?.rank && m?.rankOutOf
                                ? `${m.rank} / ${m.rankOutOf}`
                                : fmt(m?.rank))
                            : '—'}
                        </td>

                        {/* Publisher */}
                        <td className="px-4 py-3 text-gray-600 whitespace-normal">
                          {isMatch ? fmt(m?.publisher) : '—'}
                        </td>

                        {/* Quartile badge */}
                        <td className="px-4 py-3 text-center">
                          {isMatch && qLabel ? (
                            <span
                              className="inline-block px-2 py-1 rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: qColor }}
                            >
                              {qLabel}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                              Not in KRC
                            </span>
                          )}
                        </td>

                        {/* Top 10% */}
                        <td className="px-4 py-3 text-center text-base">
                          {isMatch
                            ? (m?.top10Percent ? '✅' : '—')
                            : '—'}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Bottom Stats Strip ── */}
          {!isLoading && !error && (
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex flex-wrap gap-6 items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Total Publications:</span>
                <span className="font-semibold text-gray-800">{stats.total}</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Matched in KRC:</span>
                <span className="font-semibold text-[#101A24]">{stats.matched}</span>
              </div>
              <div className="w-px h-4 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Not Matched:</span>
                <span className="font-semibold text-gray-500">{stats.unmatched}</span>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default KRCPublicationsPage;