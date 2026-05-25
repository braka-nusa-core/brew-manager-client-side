// src/components/shared/FormField.jsx
//
// Bug fix: Input and Select now use React.forwardRef so that
// React Hook Form's register() can attach its ref correctly.
// Without forwardRef, RHF cannot read field values → all fields
// show "Required" even when filled.

import { forwardRef } from 'react'
import { cn }         from '@/lib/utils'

const FormField = ({ label, error, required = false, children, className }) => (
  <div className={cn('space-y-1.5', className)}>
    <label className="block text-sm font-medium text-foreground">
      {label}
      {required && <span className="text-destructive ml-0.5"> *</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs text-destructive leading-none pt-0.5">{error}</p>
    )}
  </div>
)

// error prop is BOOLEAN on Input/Select — controls border color only.
// The error message string is handled by FormField above.

export const Input = forwardRef(({ error, className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full h-9 px-3 rounded-md border bg-background text-sm text-foreground',
      'placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
      'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
      error ? 'border-destructive focus:ring-destructive/50' : 'border-input',
      className
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export const Select = forwardRef(({ error, className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'w-full h-9 px-3 rounded-md border bg-background text-sm text-foreground',
      'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500',
      'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
      'appearance-none cursor-pointer',
      error ? 'border-destructive focus:ring-destructive/50' : 'border-input',
      className
    )}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

export default FormField