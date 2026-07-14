import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { SkeletonChart } from './SkeletonChart';
import { EmptyState } from './EmptyState';
import { Trophy, Medal } from 'lucide-react';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

export function ContributorLeaderboard({ data, isLoading }) {
  if (isLoading) return <SkeletonChart height={400} />;

  if (!data?.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-brand-teal mb-1">Top contributors</h3>
          <EmptyState icon={Trophy} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-brand-teal mb-1 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-brand-teal/70" />
          Top contributors
        </h3>
        <p className="text-sm text-brand-teal/50 mb-6">Users with most approved submissions</p>

        <div className="space-y-2">
          {data.map((item, index) => (
            <div
              key={item.user_id || index}
              className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                index < 3
                  ? 'bg-brand-cream/50 border border-brand-teal/10'
                  : 'hover:bg-brand-cream/30'
              }`}
            >
              {/* Rank / Medal */}
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center">
                {index < 3 ? (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: MEDAL_COLORS[index] + '20', border: `2px solid ${MEDAL_COLORS[index]}` }}
                  >
                    <Medal className="w-4 h-4" style={{ color: MEDAL_COLORS[index] }} />
                  </div>
                ) : (
                  <span className="text-sm font-bold text-brand-teal/40">#{item.rank}</span>
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-teal truncate">
                  {item.name}
                </p>
              </div>

              {/* Count */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-teal bg-brand-teal/10 px-3 py-1.5 rounded-lg">
                  {item.approved_count}
                  <span className="text-xs font-normal text-brand-teal/60 ml-0.5">posts</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
