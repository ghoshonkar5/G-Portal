import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { TrendingUp } from 'lucide-react';

// Generate distinct colors from the teal palette
const TEAL_PALETTE = [
  '#0B5045', '#0D6B5D', '#0F8575', '#11A08D', '#14BAA5',
  '#3CC9B5', '#64D4C3', '#8CDFD3', '#B4EAE2', '#C8A97E',
  '#A67C52', '#8B6B45', '#6F5A38', '#D4B896',
];

export function TopicTrends({ data, isLoading }) {
  const [hiddenTopics, setHiddenTopics] = useState(new Set());

  const { chartData, allTopics, topicColors } = useMemo(() => {
    if (!data?.length) return { chartData: [], allTopics: [], topicColors: {} };

    // Get all unique topics and months
    const topicsSet = new Set();
    const monthsMap = new Map();

    for (const item of data) {
      topicsSet.add(item.tag_name);
      if (!monthsMap.has(item.month)) {
        monthsMap.set(item.month, {});
      }
      monthsMap.get(item.month)[item.tag_name] = item.count;
    }

    const allTopics = Array.from(topicsSet).sort();
    const topicColors = {};
    allTopics.forEach((topic, i) => {
      topicColors[topic] = TEAL_PALETTE[i % TEAL_PALETTE.length];
    });

    // Build chart data sorted by month
    const chartData = Array.from(monthsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => {
        const entry = { month: formatMonth(month) };
        for (const topic of allTopics) {
          entry[topic] = counts[topic] || 0;
        }
        return entry;
      });

    return { chartData, allTopics, topicColors };
  }, [data]);

  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">How topic demand is changing over time</h3>
          <EmptyState icon={TrendingUp} />
        </CardContent>
      </Card>
    );
  }

  const toggleTopic = (topic) => {
    setHiddenTopics(prev => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-brand-teal text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-[200px]">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} className="flex justify-between gap-4">
            <span style={{ color: p.stroke }}>{p.name}</span>
            <span className="font-medium">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1">How topic demand is changing over time</h3>
        <p className="text-sm text-brand-teal/50 mb-4">Click legend items to toggle visibility</p>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(11, 80, 69, 0.08)" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#0B5045', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(11, 80, 69, 0.1)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#0B5045', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              onClick={(e) => toggleTopic(e.value)}
              wrapperStyle={{ cursor: 'pointer', paddingTop: 12 }}
              formatter={(value) => (
                <span style={{
                  color: hiddenTopics.has(value) ? '#ccc' : '#0B5045',
                  textDecoration: hiddenTopics.has(value) ? 'line-through' : 'none',
                  fontSize: 11,
                }}>
                  {value}
                </span>
              )}
            />
            {allTopics.map(topic => (
              <Line
                key={topic}
                type="monotone"
                dataKey={topic}
                stroke={topicColors[topic]}
                strokeWidth={2}
                dot={{ r: 3, fill: topicColors[topic] }}
                activeDot={{ r: 5 }}
                hide={hiddenTopics.has(topic)}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function formatMonth(yyyymm) {
  const [year, month] = yyyymm.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}
