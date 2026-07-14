import React from 'react';
import { BarChart3 } from 'lucide-react';

export function EmptyState({ message = "Not enough data yet — check back as more submissions come in.", icon: Icon = BarChart3 }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-teal/5 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-brand-teal/30" />
      </div>
      <p className="text-brand-teal/50 text-sm max-w-xs leading-relaxed">
        {message}
      </p>
    </div>
  );
}
