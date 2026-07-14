import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { BarChart3 } from 'lucide-react';

export function TopicFrequency({ data, isLoading }) {
  const { chartData, totalSubmissions } = useMemo(() => {
    if (!data?.length) return { chartData: [], totalSubmissions: 0 };
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const chartData = data.map(d => ({
      ...d,
      name: d.tag_name,
      percentage: ((d.count / total) * 100).toFixed(1),
    }));
    return { chartData, totalSubmissions: total };
  }, [data]);

  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">What topics are companies asking most?</h3>
          <EmptyState icon={BarChart3} />
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-brand-teal text-white text-xs px-3 py-2 rounded-lg shadow-lg">
        <p className="font-semibold">{d.name}</p>
        <p>{d.count} mentions ({d.percentage}%)</p>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1">What topics are companies asking most?</h3>
        <p className="text-sm text-brand-teal/50 mb-4">Across {totalSubmissions} topic mentions in approved submissions</p>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 60, left: 0, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fill: '#0B5045', fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={`rgba(11, 80, 69, ${0.4 + (index / chartData.length) * 0.6})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Percentage labels */}
        <div className="mt-2 flex flex-wrap gap-2">
          {chartData.slice(0, 5).map(d => (
            <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-brand-teal/70">
              <span className="w-2 h-2 rounded-full bg-brand-teal/60" />
              {d.name}: {d.percentage}%
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
