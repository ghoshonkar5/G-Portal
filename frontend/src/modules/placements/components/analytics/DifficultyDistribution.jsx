import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { Gauge } from 'lucide-react';

export function DifficultyDistribution({ data, isLoading }) {
  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">How hard are each company's rounds?</h3>
          <EmptyState icon={Gauge} />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    name: d.company_name,
    Easy: d.easy_count,
    Medium: d.medium_count,
    Hard: d.hard_count,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((sum, p) => sum + p.value, 0);
    return (
      <div className="bg-brand-teal text-white text-xs px-3 py-2 rounded-lg shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-medium">{p.value} ({total > 0 ? ((p.value / total) * 100).toFixed(0) : 0}%)</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1">How hard are each company's rounds?</h3>
        <p className="text-sm text-brand-teal/50 mb-4">Distribution of difficulty levels across interview rounds</p>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(11, 80, 69, 0.08)" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#0B5045', fontSize: 11 }}
              axisLine={{ stroke: 'rgba(11, 80, 69, 0.1)' }}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: '#0B5045', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: '#0B5045' }}>{value}</span>}
            />
            <Bar dataKey="Easy" stackId="difficulty" fill="rgba(11, 80, 69, 0.25)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Medium" stackId="difficulty" fill="rgba(11, 80, 69, 0.55)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Hard" stackId="difficulty" fill="#0B5045" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
