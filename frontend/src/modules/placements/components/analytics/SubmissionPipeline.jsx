import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { GitPullRequest } from 'lucide-react';

export function SubmissionPipeline({ data, isLoading }) {
  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">Submission activity over the last 12 weeks</h3>
          <EmptyState icon={GitPullRequest} />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    week: d.week.replace(/^\d{4}-/, ''),
    Pending: d.pending,
    Approved: d.approved,
    Rejected: d.rejected,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-brand-teal text-white text-xs px-3 py-2 rounded-lg shadow-lg">
        <p className="font-semibold mb-1">Week {label}</p>
        {payload.map(p => (
          <p key={p.name} className="flex justify-between gap-4">
            <span>{p.name}</span>
            <span className="font-medium">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1">Submission activity over the last 12 weeks</h3>
        <p className="text-sm text-brand-teal/50 mb-4">Pending, approved, and rejected submissions by week</p>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(11, 80, 69, 0.08)" />
            <XAxis
              dataKey="week"
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
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: '#0B5045' }}>{value}</span>}
            />
            <Bar dataKey="Pending" fill="#F0E4CD" stroke="#C8A97E" strokeWidth={1} radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="Approved" fill="#0B5045" radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="Rejected" fill="rgba(220, 38, 38, 0.5)" radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
