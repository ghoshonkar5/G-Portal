import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { SearchX } from 'lucide-react';

export function SearchGaps({ data, isLoading }) {
  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">What students are searching for that we don't have yet</h3>
          <EmptyState icon={SearchX} message="No search gaps detected — great coverage!" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1">What students are searching for that we don't have yet</h3>
        <p className="text-sm text-brand-teal/50 mb-6">Queries that returned zero results — consider soliciting contributions</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-teal/10">
                <th className="text-left py-3 px-2 font-semibold text-brand-teal/70 text-xs uppercase tracking-wider w-12">#</th>
                <th className="text-left py-3 px-2 font-semibold text-brand-teal/70 text-xs uppercase tracking-wider">Search Query</th>
                <th className="text-center py-3 px-2 font-semibold text-brand-teal/70 text-xs uppercase tracking-wider">Times Searched</th>
                <th className="text-center py-3 px-2 font-semibold text-brand-teal/70 text-xs uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-2 font-semibold text-brand-teal/70 text-xs uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.rank} className="border-b border-brand-teal/5 hover:bg-brand-cream/30 transition-colors">
                  <td className="py-3 px-2 text-brand-teal/50 font-medium">{item.rank}</td>
                  <td className="py-3 px-2 text-brand-teal font-medium capitalize">{item.query}</td>
                  <td className="py-3 px-2 text-center">
                    <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold">
                      {item.search_count}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px]">
                      No results
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-3">
                      Request contribution
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
