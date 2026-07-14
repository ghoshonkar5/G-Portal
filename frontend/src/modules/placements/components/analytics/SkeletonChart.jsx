import React from 'react';

export function SkeletonChart({ height = 320 }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl bg-white border border-brand-teal/10"
      style={{ height }}
    >
      <div className="absolute inset-0 animate-pulse">
        {/* Title skeleton */}
        <div className="p-6 space-y-4">
          <div className="h-5 w-48 bg-brand-teal/10 rounded-md" />
          <div className="h-3 w-32 bg-brand-teal/5 rounded-md" />
        </div>
        
        {/* Chart area skeleton */}
        <div className="px-6 flex items-end gap-3" style={{ height: height - 120 }}>
          {[65, 85, 45, 90, 55, 75, 40, 80, 60, 70].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-brand-teal/5 rounded-t-md"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(11,80,69,0.04), transparent)',
        }}
      />

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
