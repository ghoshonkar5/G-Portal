import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, type, label, error, ...props }, ref) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-brand-teal/80">
          {label}
        </label>
      )}
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-brand-teal/20 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-brand-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
