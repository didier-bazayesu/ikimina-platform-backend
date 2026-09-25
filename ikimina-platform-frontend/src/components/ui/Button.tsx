import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'soft-green' | 'soft-terracotta' | 'outline'
  size?: 'sm' | 'md'
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none rounded'
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base'
  }

  const variantClasses = {
    primary: 'bg-brand-green text-white hover:bg-brand-dark',
    'soft-green': 'bg-green-tint text-brand-green hover:bg-green-100',
    'soft-terracotta': 'bg-terracotta-tint text-terracotta hover:bg-red-100',
    outline: 'border border-border-warm bg-transparent hover:bg-black/5 text-text-main'
  }

  return (
    <button 
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
