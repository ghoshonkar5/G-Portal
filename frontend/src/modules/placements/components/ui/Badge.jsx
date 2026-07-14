import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'default', children, ...props }) {
  const variants = {
    default: "bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 border-transparent",
    secondary: "bg-white text-brand-teal border-brand-teal/20 hover:bg-brand-cream/50",
    success: "bg-green-100 text-green-800 border-transparent",
    warning: "bg-yellow-100 text-yellow-800 border-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
