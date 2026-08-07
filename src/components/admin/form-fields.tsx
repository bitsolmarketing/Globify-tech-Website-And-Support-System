'use client'

import * as React from 'react'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox, FieldError, FieldHint, Input, Label, Select, Textarea } from '@/components/ui/field'
import { cn } from '@/lib/utils'

/**
 * Field wrappers for the admin forms. Every one of these delegates to the
 * existing primitives in `@/components/ui/field`, so the admin inherits the
 * public site's focus rings, invalid states and brand tokens rather than
 * introducing a second set of form styles.
 */

type BaseProps = {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
}

function FieldFrame({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: BaseProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {error ? (
        <FieldError id={`${id}-error`}>{error}</FieldError>
      ) : (
        hint && <FieldHint id={`${id}-hint`}>{hint}</FieldHint>
      )}
    </div>
  )
}

export const TextField = React.forwardRef<
  HTMLInputElement,
  BaseProps & React.ComponentPropsWithoutRef<'input'>
>(({ label, error, hint, required, className, id, ...props }, ref) => {
  const generated = React.useId()
  const fieldId = id ?? generated

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <Input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        {...props}
      />
    </FieldFrame>
  )
})
TextField.displayName = 'TextField'

export const TextareaField = React.forwardRef<
  HTMLTextAreaElement,
  BaseProps & React.ComponentPropsWithoutRef<'textarea'>
>(({ label, error, hint, required, className, id, ...props }, ref) => {
  const generated = React.useId()
  const fieldId = id ?? generated

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <Textarea
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        {...props}
      />
    </FieldFrame>
  )
})
TextareaField.displayName = 'TextareaField'

export const SelectField = React.forwardRef<
  HTMLSelectElement,
  BaseProps &
    React.ComponentPropsWithoutRef<'select'> & {
      options: { value: string; label: string }[]
      /** Rendered as a disabled first option — `<select>` has no placeholder. */
      placeholder?: string
    }
>(({ label, error, hint, required, className, id, options, placeholder, ...props }, ref) => {
  const generated = React.useId()
  const fieldId = id ?? generated

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={className}
    >
      <Select
        ref={ref}
        id={fieldId}
        options={options}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        {...props}
      />
    </FieldFrame>
  )
})
SelectField.displayName = 'SelectField'

export const CheckboxField = React.forwardRef<
  HTMLInputElement,
  Omit<BaseProps, 'required'> & React.ComponentPropsWithoutRef<'input'>
>(({ label, error, hint, className, id, ...props }, ref) => {
  const generated = React.useId()
  const fieldId = id ?? generated

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-start gap-3">
        <Checkbox
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
          {...props}
        />
        <Label htmlFor={fieldId} className="font-normal text-ink-700">
          {label}
        </Label>
      </div>
      {error ? (
        <FieldError id={`${fieldId}-error`}>{error}</FieldError>
      ) : (
        hint && <FieldHint id={`${fieldId}-hint`}>{hint}</FieldHint>
      )}
    </div>
  )
})
CheckboxField.displayName = 'CheckboxField'

/* ---------------------------------------------------------------------------
 * Layout helpers
 * ------------------------------------------------------------------------ */

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('p-6 sm:p-7', className)}>
      <div className="mb-6">
        <h2 className="font-sans text-base font-bold text-ink-900">{title}</h2>
        {description && <p className="mt-1 text-[0.9375rem] text-ink-500">{description}</p>}
      </div>
      <div className="grid gap-5">{children}</div>
    </Card>
  )
}

/** A removable row inside a `useFieldArray` group. */
export function RepeatableRow({
  index,
  label,
  onRemove,
  disableRemove,
  children,
}: {
  index: number
  label: string
  onRemove: () => void
  disableRemove?: boolean
  children: React.ReactNode
}) {
  return (
    <fieldset className="relative rounded-2xl border border-hairline bg-ink-50/40 p-5">
      <legend className="px-1 font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
        {label} {index + 1}
      </legend>

      <div className="grid gap-4">{children}</div>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        disabled={disableRemove}
        aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
        className="absolute top-3 right-3 text-ink-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 aria-hidden />
      </Button>
    </fieldset>
  )
}

export function AddRowButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button type="button" variant="secondary" size="md" onClick={onClick} className="justify-self-start">
      <Plus aria-hidden />
      {children}
    </Button>
  )
}

/** Submit button wired to react-hook-form's `isSubmitting`. */
export function SaveButton({
  saving,
  children = 'Save changes',
}: {
  saving: boolean
  children?: React.ReactNode
}) {
  return (
    <Button type="submit" variant="primary" size="lg" disabled={saving}>
      {saving ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          Saving
        </>
      ) : (
        <>
          <Save aria-hidden />
          {children}
        </>
      )}
    </Button>
  )
}

/** Submit button for plain `<form action={serverAction}>` posts. */
export function FormActionButton({
  children,
  pendingLabel = 'Saving',
  variant = 'primary',
}: {
  children: React.ReactNode
  pendingLabel?: string
  variant?: React.ComponentProps<typeof Button>['variant']
}) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} size="md" disabled={pending}>
      {pending ? (
        <>
          <Loader2 aria-hidden className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
