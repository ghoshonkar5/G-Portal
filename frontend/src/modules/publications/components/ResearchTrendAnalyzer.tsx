import { useState } from 'react';
import { analyzeResearchTrends } from '../api/publicationsApi';

interface TrendData {
  dominant_research_areas: string[];
  most_cited_author: string;
  top_journal: string;
  quartile_distribution: Record<string, number>;
  yoy_trend: string;
  insight: string;
}

interface Props {
  publications: any[]; // Pass existing pubs array from parent
}

export default function ResearchTrendAnalyzer({ publications }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TrendData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (publications.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeResearchTrends(publications);
      if (result.success) setData(result.data);
      else setError('Analysis failed. Try again.');
    } catch {
      setError('Could not reach AI service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6 mt-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">AI Research Trend Analysis</h3>
          <p className="text-sm text-gray-500">
            Powered by Gemini · {publications.length} publications
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading || publications.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium 
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Trends'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          
          {/* Insight */}
          <div className="col-span-2 bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Executive Summary</p>
            <p className="text-sm text-blue-800">{data.insight}</p>
          </div>

          {/* Research Areas */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Dominant Research Areas</p>
            <div className="flex flex-wrap gap-2">
              {data.dominant_research_areas.map((area, i) => (
                <span key={i} className="px-2 py-1 bg-white border rounded text-xs text-gray-700">
                  {area}
                </span>
              ))}
            </div>
          </div>

          {/* Quartile Distribution */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Quartile Distribution</p>
            <div className="grid grid-cols-5 gap-1">
              {Object.entries(data.quartile_distribution).map(([q, count]) => (
                <div key={q} className="text-center">
                  <div className="text-lg font-bold text-blue-600">{count}</div>
                  <div className="text-xs text-gray-500">{q}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Most Cited Author</p>
            <p className="text-sm text-gray-800">{data.most_cited_author}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Top Journal</p>
            <p className="text-sm text-gray-800">{data.top_journal}</p>
          </div>

          {/* YoY Trend */}
          <div className="col-span-2 bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-green-900 mb-1">Year-on-Year Trend</p>
            <p className="text-sm text-green-800">{data.yoy_trend}</p>
          </div>

        </div>
      )}
    </div>
  );
}
