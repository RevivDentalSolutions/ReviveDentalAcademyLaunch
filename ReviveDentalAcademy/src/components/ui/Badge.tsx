import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'mint' | 'teal' | 'charcoal';
  className?: string;
}

export default function Badge({ children, variant = 'mint', className = '' }: BadgeProps) {
  const variantStyles = {
    mint: 'bg-mint-100 text-mint-800',
    teal: 'bg-teal-100 text-teal-800',
    charcoal: 'bg-charcoal-100 text-charcoal-700',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
