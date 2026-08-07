'use client'

import * as React from 'react'
import { Loader2, Mail, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FieldError, Honeypot, Input, Label } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { newsletterSchema } from '@/lib/validations'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'submitting'

/**
 * Deliberately hand-rolled rather than react-hook-form: a single field does
 * not justify shipping the library on every page that renders the footer.
 */
export function NewsletterForm({
  tone = 'dark',
  className,
}: {
  tone?: 'dark' | 'light'
  className?: string
}) {
  const [status, setStatus] = React.useState<Status>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const id = React.useId()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const payload = {
      email: String(formData.get('email') ?? ''),
      website: String(formData.get('website') ?? ''),
    }

    const parsed = newsletterSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check your email address')
      return
    }

    setStatus('submitting')
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      if (!response.ok) throw new Error('Request failed')

      event.currentTarget.reset()
      toast.success('You are subscribed', {
        description: 'Check your inbox — the next career guide lands in a fortnight.',
      })
    } catch {
      toast.error('Subscription failed', {
        description: 'Something went wrong on our side. Please try again in a moment.',
      })
    } finally {
      setStatus('idle')
    }
  }

  const isLight = tone === 'light'

  return (
    <form onSubmit={onSubmit} className={cn('relative w-full', className)} noValidate>
      <Label htmlFor={`${id}-email`} className="sr-only">
        Email address
      </Label>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <div className="relative flex-1">
          <Mail
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2',
              isLight ? 'text-white/40' : 'text-ink-400',
            )}
          />
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'pl-11',
              isLight &&
                'border-white/15 bg-white/8 text-white placeholder:text-white/40 hover:border-white/25 focus:border-gold-400 focus:ring-gold-400/20',
            )}
          />
        </div>

        <Button
          type="submit"
          variant={isLight ? 'gold' : 'primary'}
          size="lg"
          disabled={status === 'submitting'}
          className="h-12 shrink-0"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Subscribing
            </>
          ) : (
            <>
              Subscribe
              <Send aria-hidden />
            </>
          )}
        </Button>
      </div>

      <Honeypot name="website" />

      {error && (
        <div className="mt-2">
          <FieldError id={`${id}-error`}>{error}</FieldError>
        </div>
      )}

      <p className={cn('mt-2.5 font-sans text-xs', isLight ? 'text-white/45' : 'text-ink-400')}>
        By subscribing you agree to our{' '}
        <a
          href="/privacy-policy"
          className={cn('underline underline-offset-2', isLight ? 'hover:text-white' : 'hover:text-brand-800')}
        >
          privacy policy
        </a>
        . Unsubscribe any time.
      </p>
    </form>
  )
}
