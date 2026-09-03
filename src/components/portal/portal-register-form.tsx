'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, FieldHint, Honeypot, Input, Label } from '@/components/ui/field'

export type PortalRegisterState = { error?: string; field?: string }

const FIELDS = [
  { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name', required: true },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'username', required: true },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', required: false },
] as const

/**
 * Student self-registration.
 *
 * Instructors are deliberately absent from this form. Teaching accounts are
 * provisioned by an administrator, because an account that can mark work and
 * issue certificates is not something anyone should be able to grant
 * themselves by filling in a form.
 *
 * Registering creates the account; it does not enrol anyone on anything. A new
 * student lands on an empty dashboard until the office puts them on a batch,
 * which is the honest state of affairs and avoids inventing an enrolment the
 * finance side has not agreed to.
 */
export function PortalRegisterForm({
  action,
}: {
  action: (prev: PortalRegisterState, formData: FormData) => Promise<PortalRegisterState>
}) {
  const [state, formAction, pending] = React.useActionState(action, {})
  const formId = React.useId()

  const errorFor = (name: string) => (state.field === name ? state.error : undefined)

  return (
    <Card className="mt-6 border-white/12 bg-white p-7 shadow-lift sm:p-9">
      <h1 className="font-sans text-xl font-extrabold tracking-tight text-ink-900">
        Create your account
      </h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-500">
        Already enrolled with us? Use the email address you gave the office and your dashboard will
        pick up your batch.
      </p>

      <form action={formAction} className="mt-6 grid gap-5">
        <Honeypot name="website" />

        {FIELDS.map((field) => (
          <div key={field.name} className="grid gap-2">
            <Label htmlFor={`${formId}-${field.name}`} required={field.required}>
              {field.label}
            </Label>
            <Input
              id={`${formId}-${field.name}`}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              required={field.required}
              aria-invalid={errorFor(field.name) ? true : undefined}
              aria-describedby={errorFor(field.name) ? `${formId}-${field.name}-error` : undefined}
            />
            <FieldError id={`${formId}-${field.name}-error`}>{errorFor(field.name)}</FieldError>
          </div>
        ))}

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-password`} required>
            Password
          </Label>
          <Input
            id={`${formId}-password`}
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
            <FieldHint>At least 12 characters. A short phrase you will remember works well.</FieldHint>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-confirm`} required>
            Confirm password
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

        <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Creating account
            </>
          ) : (
            <>
              Create account
              <UserPlus aria-hidden />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 border-t border-hairline pt-5 text-center font-sans text-[0.8125rem] text-ink-500">
        Already have an account?{' '}
        <Link href="/portal/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
