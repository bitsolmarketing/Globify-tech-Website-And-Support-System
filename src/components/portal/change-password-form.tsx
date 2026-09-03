'use client'

import * as React from 'react'
import { KeyRound, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, FieldHint, Input, Label } from '@/components/ui/field'

export type ChangePasswordState = { error?: string; field?: string; done?: boolean }

/**
 * Used both for the forced change after an admin reset and for a voluntary one
 * from the profile page. The current password is required in both cases: a
 * borrowed unlocked laptop is the realistic threat, and it is defeated by
 * asking for something the borrower does not know.
 */
export function ChangePasswordForm({
  action,
  title,
  description,
  submitLabel = 'Update password',
}: {
  action: (prev: ChangePasswordState, formData: FormData) => Promise<ChangePasswordState>
  title: string
  description: string
  submitLabel?: string
}) {
  const [state, formAction, pending] = React.useActionState(action, {})
  const formId = React.useId()

  const errorFor = (name: string) => (state.field === name ? state.error : undefined)

  return (
    <Card className="p-7 sm:p-8">
      <h2 className="font-sans text-lg font-bold tracking-tight text-ink-900">{title}</h2>
      <p className="mt-1.5 text-[0.9375rem] text-ink-500">{description}</p>

      {state.done && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 font-sans text-[0.8125rem] font-medium text-emerald-800 ring-1 ring-emerald-200 ring-inset"
        >
          Your password has been updated.
        </p>
      )}

      <form action={formAction} className="mt-6 grid max-w-md gap-5">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-current`} required>
            Current password
          </Label>
          <Input
            id={`${formId}-current`}
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={errorFor('currentPassword') ? true : undefined}
          />
          <FieldError>{errorFor('currentPassword')}</FieldError>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-new`} required>
            New password
          </Label>
          <Input
            id={`${formId}-new`}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            aria-invalid={errorFor('password') ? true : undefined}
          />
          {errorFor('password') ? (
            <FieldError>{errorFor('password')}</FieldError>
          ) : (
            <FieldHint>At least 12 characters.</FieldHint>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-confirm`} required>
            Confirm new password
          </Label>
          <Input
            id={`${formId}-confirm`}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={errorFor('confirmPassword') ? true : undefined}
          />
          <FieldError>{errorFor('confirmPassword')}</FieldError>
        </div>

        {state.error && !state.field && <FieldError>{state.error}</FieldError>}

        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Saving
            </>
          ) : (
            <>
              {submitLabel}
              <KeyRound aria-hidden />
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
