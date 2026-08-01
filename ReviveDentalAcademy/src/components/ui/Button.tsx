import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  children: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'default',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-charcoal-900 text-white hover:bg-charcoal-800 focus:ring-charcoal-500 shadow-soft',
    secondary: 'bg-white text-charcoal-900 border border-charcoal-200 hover:bg-cream-100 focus:ring-charcoal-300',
    accent: 'bg-mint-500 text-white hover:bg-mint-600 focus:ring-mint-400 shadow-soft',
    ghost: 'bg-transparent text-charcoal-700 hover:bg-cream-200 focus:ring-charcoal-300',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-xs',
    default: 'px-6 py-3 text-sm',
    lg: 'px-8 py-4 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
