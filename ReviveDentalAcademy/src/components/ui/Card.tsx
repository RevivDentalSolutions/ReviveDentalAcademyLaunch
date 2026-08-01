import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive' | 'accent';
  onClick?: () => void;
}

export default function Card({ children, className = '', variant = 'default', onClick }: CardProps) {
  const baseStyles = 'rounded-2xl p-6 border border-charcoal-100/50';
  
  const variantStyles = {
    default: 'bg-white shadow-card',
    interactive: 'bg-white shadow-card cursor-pointer transition-shadow duration-300 hover:shadow-elevated',
    accent: 'bg-gradient-to-br from-mint-50 to-teal-50 border-mint-200 shadow-card',
  };

  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
