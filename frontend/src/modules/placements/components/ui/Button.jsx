import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-brand-teal text-white hover:bg-brand-teal/90 shadow-sm",
    secondary: "bg-brand-cream text-brand-teal hover:bg-[#E5D7BE] border border-brand-teal/20",
    outline: "border-2 border-brand-teal text-brand-teal hover:bg-brand-teal/10",
    ghost: "text-brand-teal hover:bg-brand-teal/10",
  };
  
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-6 py-2 text-base",
    lg: "h-12 px-8 text-lg",
    icon: "h-10 w-10",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      ref={ref}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';
