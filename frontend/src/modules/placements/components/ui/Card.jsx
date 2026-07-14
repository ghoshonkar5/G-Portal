import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const Card = React.forwardRef(({ className, children, hoverable = false, ...props }, ref) => {
  const Component = hoverable ? motion.div : 'div';
  const hoverProps = hoverable ? { whileHover: { y: -4 }, transition: { duration: 0.2 } } : {};

  return (
    <Component
      ref={ref}
      className={cn(
        "rounded-xl border border-brand-teal/10 bg-white shadow-sm overflow-hidden",
        hoverable && "hover:shadow-md transition-shadow cursor-pointer",
        className
      )}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ className, children, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className, children, ...props }) => (
  <h3 className={cn("font-semibold leading-none tracking-tight text-brand-teal text-xl", className)} {...props}>
    {children}
  </h3>
);

export const CardContent = ({ className, children, ...props }) => (
  <div className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
);
