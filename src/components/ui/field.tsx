import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { AlertCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

/* --------------------------------------------------------------- Label --- */

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { required?: boolean }
>(({ className, children, required, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('font-sans text-sm font-semibold text-ink-800', className)}
    {...props}
  >
    {children}
    {required && (
      <span aria-hidden className="ml-0.5 text-red-600">
        *
      </span>
    )}
  </LabelPrimitive.Root>
))
Label.displayName = 'Label'

/* -------------------------------------------------------------- Shared --- */

const controlBase = [
  'w-full rounded-xl border bg-white px-4 font-sans text-[0.9375rem] text-ink-900',
  'placeholder:text-ink-400',
  'transition-[border-color,box-shadow] duration-200',
  'border-ink-200 hover:border-ink-300',
  'focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none',
  'disabled:cursor-not-allowed disabled:bg-ink-50 disabled:opacity-60',
  'aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/12',
]

/* -------------------------------------------------------------- Input ---- */

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(controlBase, 'h-12', className)} {...props} />
  ),
)
Input.displayName = 'Input'

/* ----------------------------------------------------------- Textarea ---- */

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<'textarea'>
>(({ className, rows = 5, ...props }, ref) => (
  <textarea
    ref={ref}
    rows={rows}
    className={cn(controlBase, 'resize-y py-3 leading-relaxed', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

/* ------------------------------------------------------------- Select --- */

/**
 * Native <select> rather than a Radix listbox: it is fully accessible out of
 * the box, uses the platform picker on mobile, and adds zero JavaScript.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentPropsWithoutRef<'select'> & {
    options: { value: string; label: string }[]
    /** Rendered as a disabled first <option> — `<select>` has no placeholder. */
    placeholder?: string
  }
>(({ className, options, placeholder, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        controlBase,
        'h-12 cursor-pointer appearance-none bg-none pr-11',
        className,
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  </div>
))
Select.displayName = 'Select'

/* ----------------------------------------------------------- Checkbox ---- */

export const Checkbox = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'mt-0.5 size-5 shrink-0 cursor-pointer appearance-none rounded-md border-2 border-ink-300 bg-white',
        'transition-[background-color,border-color] duration-200',
        'checked:border-brand-900 checked:bg-brand-900',
        "checked:bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22white%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m3 8.5 3.2 3.2L13 5%22/%3E%3C/svg%3E')] checked:bg-[length:14px_14px] checked:bg-center checked:bg-no-repeat",
        'hover:border-brand-600',
        'focus-visible:ring-4 focus-visible:ring-brand-600/15',
        'aria-[invalid=true]:border-red-500',
        className,
      )}
      {...props}
    />
  ),
)
Checkbox.displayName = 'Checkbox'

/* ---------------------------------------------------------- Messaging ---- */

export function FieldError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-1.5 font-sans text-[0.8125rem] font-medium text-red-600"
    >
      <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function FieldHint({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="font-sans text-[0.8125rem] text-ink-500">
      {children}
    </p>
  )
}

/** Off-screen honeypot input. Bots fill it; the server rejects those submissions. */
export function Honeypot(props: React.ComponentPropsWithoutRef<'input'>) {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden" >
      <label htmlFor="website-field">Leave this field empty</label>
      <input id="website-field" tabIndex={-1} autoComplete="off" {...props} />
    </div>
  )
}
