import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { HelpCircle } from 'lucide-react';

export function TopQuestions({ data, isLoading }) {
  if (isLoading) return <SkeletonChart height={600} />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">Questions appearing across multiple companies</h3>
          <EmptyState icon={HelpCircle} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1">Questions appearing across multiple companies</h3>
        <p className="text-sm text-brand-teal/50 mb-6">Most frequently asked questions across all interviews</p>

        <div className="space-y-3">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-xl bg-brand-cream/30 hover:bg-brand-cream/60 transition-colors border border-transparent hover:border-brand-teal/10"
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-teal/10 flex items-center justify-center">
                <span className="text-sm font-bold text-brand-teal">{index + 1}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-teal leading-relaxed">
                  {item.question}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* Count badge */}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal/70 bg-brand-teal/10 px-2.5 py-1 rounded-full">
                    Asked {item.count} time{item.count > 1 ? 's' : ''}
                  </span>

                  {/* Company chips */}
                  {item.companies.map(company => (
                    <Badge key={company} variant="secondary" className="text-[10px]">
                      {company}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
