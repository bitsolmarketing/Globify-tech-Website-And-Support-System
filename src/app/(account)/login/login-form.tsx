'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'

import { studentLoginAction, type LoginState } from '../actions'

/**
 * Plain `useActionState` over `FormData`, matching the admin sign-in form and
 * for the same reason: the password never enters React state, and the only
 * validation worth showing is the server's answer.
 *
 * The action is imported here rather than passed down as a prop. That keeps the
 * Server→Client boundary free of anything unserialisable, which is the mistake
 * that took every admin CRUD form down in production once already.
 */
export function StudentLoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = React.useActionState<LoginState, FormData>(
    studentLoginAction,
    {},
  )
  const formId = React.useId()

  return (
    <form action={formAction} className="mt-7 grid gap-5">
      {/* Where to land afterwards, preserved across a failed attempt. */}
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-email`} required>
          Email
        </Label>
        <Input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.values?.email ?? ''}
          placeholder="you@example.com"
          aria-invalid={state.error ? true : undefined}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor={`${formId}-password`} required>
            Password
          </Label>
          <Link
            href="/contact"
            className="font-sans text-xs font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id={`${formId}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? `${formId}-error` : undefined}
        />
        <FieldError id={`${formId}-error`}>{state.error}</FieldError>
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Signing in
          </>
        ) : (
          <>
            Sign in
            <LogIn aria-hidden />
          </>
        )}
      </Button>
    </form>
  )
}
