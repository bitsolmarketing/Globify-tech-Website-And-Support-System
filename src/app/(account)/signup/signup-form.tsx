'use client'

import * as React from 'react'
import { Loader2, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'

import { signupAction, type SignupState } from '../actions'

/**
 * Field errors come back from the server keyed by field name — the zod schema
 * lives in `@/lib/validations` and is parsed inside the action, never handed
 * across the boundary as a prop.
 *
 * The trade is one round trip per mistake instead of instant client-side
 * feedback. It is worth it here: the two checks that actually reject people —
 * "this email is already registered" and "that password is too short" — are a
 * database lookup and a server-side rule, so a client-side copy of the schema
 * would duplicate the code without removing the round trip.
 */
export function SignupForm({ next }: { next: string }) {
  const [state, formAction, pending] = React.useActionState<SignupState, FormData>(signupAction, {})
  const formId = React.useId()

  const error = (field: string) => state.errors?.[field]

  return (
    <form action={formAction} className="mt-7 grid gap-5">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 font-sans text-[0.8125rem] font-medium text-red-800 ring-1 ring-red-200 ring-inset"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor={`${formId}-name`} required>
          Full name
        </Label>
        <Input
          id={`${formId}-name`}
          name="name"
          autoComplete="name"
          required
          defaultValue={state.values?.name ?? ''}
          placeholder="Ayesha Khan"
          aria-invalid={error('name') ? true : undefined}
          aria-describedby={error('name') ? `${formId}-name-error` : undefined}
        />
        <FieldError id={`${formId}-name-error`}>{error('name')}</FieldError>
      </div>

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
          aria-invalid={error('email') ? true : undefined}
          aria-describedby={error('email') ? `${formId}-email-error` : undefined}
        />
        <FieldError id={`${formId}-email-error`}>{error('email')}</FieldError>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-phone`} required>
            Phone
          </Label>
          <Input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            defaultValue={state.values?.phone ?? ''}
            placeholder="0300 1234567"
            aria-invalid={error('phone') ? true : undefined}
            aria-describedby={error('phone') ? `${formId}-phone-error` : undefined}
          />
          <FieldError id={`${formId}-phone-error`}>{error('phone')}</FieldError>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-city`}>City</Label>
          <Input
            id={`${formId}-city`}
            name="city"
            autoComplete="address-level2"
            defaultValue={state.values?.city ?? ''}
            placeholder="Faisalabad"
          />
        </div>
      </div>

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
          minLength={8}
          placeholder="At least 8 characters"
          aria-invalid={error('password') ? true : undefined}
          aria-describedby={`${formId}-password-hint ${formId}-password-error`}
        />
        <p id={`${formId}-password-hint`} className="font-sans text-xs text-ink-500">
          At least 8 characters. A short phrase you will remember beats a short jumble you will not.
        </p>
        <FieldError id={`${formId}-password-error`}>{error('password')}</FieldError>
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
          placeholder="••••••••"
          aria-invalid={error('confirmPassword') ? true : undefined}
          aria-describedby={error('confirmPassword') ? `${formId}-confirm-error` : undefined}
        />
        <FieldError id={`${formId}-confirm-error`}>{error('confirmPassword')}</FieldError>
      </div>

      {/* Honeypot. Hidden from people and from screen readers; bots fill it. */}
      <div aria-hidden className="hidden">
        <label htmlFor={`${formId}-website`}>Website</label>
        <input id={`${formId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-2">
        <label className="flex items-start gap-3 font-sans text-[0.8125rem] leading-relaxed text-ink-600">
          <input
            name="consent"
            type="checkbox"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-ink-300 text-brand-700 focus:ring-2 focus:ring-brand-600/20"
            aria-invalid={error('consent') ? true : undefined}
          />
          <span>
            I agree to the{' '}
            <a href="/terms" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
              terms
            </a>{' '}
            and the{' '}
            <a
              href="/privacy-policy"
              className="font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              privacy policy
            </a>
            .
          </span>
        </label>
        <FieldError>{error('consent')}</FieldError>
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Creating your account
          </>
        ) : (
          <>
            Create account
            <UserPlus aria-hidden />
          </>
        )}
      </Button>
    </form>
  )
}
