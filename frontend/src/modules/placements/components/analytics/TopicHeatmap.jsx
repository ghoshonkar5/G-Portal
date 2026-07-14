import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { Grid3X3 } from 'lucide-react';

export function TopicHeatmap({ data, isLoading }) {
  const [tooltip, setTooltip] = useState(null);

  const { companies, tags, matrix, maxCount } = useMemo(() => {
    if (!data?.length) return { companies: [], tags: [], matrix: {}, maxCount: 0 };

    const companiesSet = new Set();
    const tagsSet = new Set();
    const matrix = {};
    let maxCount = 0;

    for (const item of data) {
      companiesSet.add(item.company_name);
      tagsSet.add(item.tag_name);
      const key = `${item.company_name}|||${item.tag_name}`;
      matrix[key] = item.count;
      if (item.count > maxCount) maxCount = item.count;
    }

    return {
      companies: Array.from(companiesSet).sort(),
      tags: Array.from(tagsSet).sort(),
      matrix,
      maxCount,
    };
  }, [data]);

  if (isLoading) return <SkeletonChart />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">Topic × Company Heatmap</h3>
          <EmptyState icon={Grid3X3} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1">Topic × Company Heatmap</h3>
        <p className="text-sm text-brand-teal/50 mb-6">Which topics each company asks most frequently</p>

        <div className="overflow-x-auto">
          <div
            className="grid gap-0.5"
            style={{
              gridTemplateColumns: `140px repeat(${tags.length}, minmax(60px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="text-xs font-semibold text-brand-teal/50 p-2" />
            {tags.map(tag => (
              <div key={tag} className="text-xs font-semibold text-brand-teal/70 p-2 text-center truncate" title={tag}>
                {tag}
              </div>
            ))}

            {/* Data rows */}
            {companies.map(company => (
              <React.Fragment key={company}>
                <div className="text-xs font-medium text-brand-teal/80 p-2 flex items-center truncate" title={company}>
                  {company}
                </div>
                {tags.map(tag => {
                  const key = `${company}|||${tag}`;
                  const count = matrix[key] || 0;
                  const opacity = count > 0 ? 0.1 + (count / maxCount) * 0.9 : 0;

                  return (
                    <div
                      key={key}
                      className="relative flex items-center justify-center p-2 rounded-md cursor-default transition-transform hover:scale-105 min-h-[36px]"
                      style={{
                        backgroundColor: count > 0 ? `rgba(11, 80, 69, ${opacity})` : 'rgba(11, 80, 69, 0.03)',
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        setTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                          text: count > 0
                            ? `${company} asked ${tag} in ${count} submission${count > 1 ? 's' : ''}.`
                            : `${company} — no ${tag} questions yet.`,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {count > 0 && (
                        <span className={`text-xs font-bold ${opacity > 0.5 ? 'text-white' : 'text-brand-teal/70'}`}>
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Color legend */}
        <div className="mt-4 flex items-center gap-2 justify-end">
          <span className="text-xs text-brand-teal/50">Less</span>
          <div className="flex gap-0.5">
            {[0.1, 0.3, 0.5, 0.7, 0.9, 1.0].map(op => (
              <div
                key={op}
                className="w-5 h-3 rounded-sm"
                style={{ backgroundColor: `rgba(11, 80, 69, ${op})` }}
              />
            ))}
          </div>
          <span className="text-xs text-brand-teal/50">More</span>
        </div>

        {/* Tooltip portal */}
        {tooltip && (
          <div
            className="fixed z-50 bg-brand-teal text-white text-xs px-3 py-2 rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            {tooltip.text}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-brand-teal" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
