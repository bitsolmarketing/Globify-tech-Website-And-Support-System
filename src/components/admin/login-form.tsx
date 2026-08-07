'use client'

import * as React from 'react'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, Input, Label } from '@/components/ui/field'

type LoginState = { error?: string }

/**
 * Credentials sign-in. Deliberately a plain `useActionState` form rather than
 * react-hook-form: the browser must never hold the password in component
 * state, and the only meaningful validation is the server's answer.
 */
export function LoginForm({
  action,
  missingConfig,
}: {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>
  /** Env vars that must be set before sign-in can work, e.g. `AUTH_SECRET`. */
  missingConfig: string[]
}) {
  const [state, formAction, pending] = React.useActionState(action, {})
  const formId = React.useId()

  return (
    <Card className="mt-6 border-white/12 bg-white p-7 shadow-lift sm:p-9">
      <h1 className="font-sans text-xl font-extrabold tracking-tight text-ink-900">Sign in</h1>
      <p className="mt-1.5 text-[0.9375rem] text-ink-500">
        Use the administrator account seeded from your environment variables.
      </p>

      {missingConfig.length > 0 && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 rounded-xl bg-gold-50 px-4 py-3 font-sans text-[0.8125rem] font-medium text-gold-900 ring-1 ring-gold-200 ring-inset"
        >
          <AlertCircle aria-hidden className="mt-px size-4 shrink-0" />
          <div>
            <p>Sign-in is not configured yet. Add the following to your environment:</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {missingConfig.map((key) => (
                <li key={key} className="rounded-md bg-gold-100 px-2 py-0.5 font-mono text-xs">
                  {key}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-gold-800">
              Then run <code className="font-mono">npm run db:migrate &amp;&amp; npm run db:seed</code>.
              See README › Admin setup.
            </p>
          </div>
        </div>
      )}

      <form action={formAction} className="mt-6 grid gap-5">
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
            placeholder="admin@globifytech.com"
            aria-invalid={state.error ? true : undefined}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-password`} required>
            Password
          </Label>
          <Input
            id={`${formId}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
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
    </Card>
  )
}
