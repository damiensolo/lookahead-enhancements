
import React from 'react';
import { cn } from '../../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

const buttonVariants: { [key: string]: string } = {
  default: 'bg-slate-900 text-slate-50 hover:bg-slate-900/90',
  destructive: 'bg-red-500 text-slate-50 hover:bg-red-500/90',
  outline: 'border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-100/80',
  ghost: 'hover:bg-slate-100 hover:text-slate-900',
  link: 'text-slate-900 underline-offset-4 hover:underline',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          'h-10 px-4 py-2',
          buttonVariants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
