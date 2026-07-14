import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { Calendar } from 'lucide-react';

export function CompanyTimeline({ data, isLoading }) {
  const { chartData, companies } = useMemo(() => {
    if (!data?.length) return { chartData: [], companies: [] };

    const companiesSet = new Set();
    const monthMap = new Map();

    for (const item of data) {
      companiesSet.add(item.company_name);
      if (!monthMap.has(item.month)) {
        monthMap.set(item.month, {});
      }
      monthMap.get(item.month)[item.company_name] = item.submission_count;
    }

    const companies = Array.from(companiesSet).sort();
    const chartData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => {
        const entry = { month: formatMonth(month) };
        for (const company of companies) {
          entry[company] = counts[company] || 0;
        }
        return entry;
      });

    return { chartData, companies };
  }, [data]);

  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">When do companies visit University?</h3>
          <EmptyState icon={Calendar} />
        </CardContent>
      </Card>
    );
  }

  const COLORS = [
    '#0B5045', '#0D6B5D', '#0F8575', '#11A08D', '#14BAA5',
    '#C8A97E', '#A67C52', '#8B6B45', '#3CC9B5', '#64D4C3',
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-brand-teal text-white text-xs px-3 py-2 rounded-lg shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        {payload.filter(p => p.value > 0).map(p => (
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
        <h3 className="text-lg font-bold text-brand-teal mb-1">When do companies visit University?</h3>
        <p className="text-sm text-brand-teal/50 mb-4">Based on interview dates reported by contributors</p>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value) => <span style={{ color: '#0B5045' }}>{value}</span>}
            />
            {companies.map((company, i) => (
              <Bar
                key={company}
                dataKey={company}
                stackId="companies"
                fill={COLORS[i % COLORS.length]}
                radius={i === companies.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
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
