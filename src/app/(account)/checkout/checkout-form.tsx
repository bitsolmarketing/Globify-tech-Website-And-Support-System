'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Send, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, FieldHint, Input, Label, Select, Textarea } from '@/components/ui/field'
import { formatPKR } from '@/lib/utils'

import { reserveCourseSeat, submitPaymentProof, type PaymentState } from '../actions'

const METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'cash', label: 'Cash at the campus' },
]

/**
 * The payment-claim form.
 *
 * It submits a receipt, and it is careful to promise nothing more than that.
 * Every string here says "we will confirm" rather than "you are enrolled",
 * because at this point the site genuinely does not know whether the money
 * arrived — an admin decides that, by hand, on the review screen. A confirmation
 * message that overstated it would be a lie the admissions team has to walk
 * back one student at a time.
 */
export function CheckoutForm({
  purpose,
  slug,
  amount,
  what,
}: {
  purpose: 'course' | 'plan'
  slug: string
  amount: number
  /** What is being bought, for the confirmation copy. */
  what: string
}) {
  const [state, formAction, pending] = React.useActionState<PaymentState, FormData>(
    submitPaymentProof,
    {},
  )
  const formId = React.useId()
  const [method, setMethod] = React.useState('bank_transfer')

  const error = (field: string) => state.errors?.[field]

  if (state.ok) {
    return (
      <Card className="p-7 text-center sm:p-9">
        <CheckCircle2 aria-hidden className="mx-auto size-10 text-emerald-600" />
        <h2 className="mt-4 font-sans text-xl font-extrabold tracking-tight text-ink-900">
          Receipt received
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-600">
          Thank you. Our admissions team will confirm your payment for {what} and activate your
          access — usually within one working day. You will see the status change on your dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" size="md">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="md">
            <Link href="/courses">Browse more courses</Link>
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 sm:p-7">
      <h2 className="font-sans text-lg font-extrabold tracking-tight text-ink-900">
        2. Confirm your payment
      </h2>
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-600">
        Tell us how you sent {formatPKR(amount)} and attach the receipt.
      </p>

      <form action={formAction} className="mt-6 grid gap-5">
        <input type="hidden" name="purpose" value={purpose} />
        <input type="hidden" name="slug" value={slug} />

        {state.error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 font-sans text-[0.8125rem] font-medium text-red-800 ring-1 ring-red-200 ring-inset"
          >
            {state.error}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-method`} required>
            How did you pay?
          </Label>
          <Select
            id={`${formId}-method`}
            name="method"
            options={METHODS}
            required
            value={method}
            onChange={(event) => setMethod(event.target.value)}
            aria-invalid={error('method') ? true : undefined}
          />
          <FieldError>{error('method')}</FieldError>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-sender`} required>
            Name on the sending account
          </Label>
          <Input
            id={`${formId}-sender`}
            name="senderName"
            required
            placeholder="The account the money came from"
            aria-invalid={error('senderName') ? true : undefined}
            aria-describedby={`${formId}-sender-hint`}
          />
          <FieldHint id={`${formId}-sender-hint`}>
            Often a parent or relative rather than the student — tell us whose account it was so we
            can match the transfer.
          </FieldHint>
          <FieldError>{error('senderName')}</FieldError>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-ref`}>Transaction ID</Label>
          <Input
            id={`${formId}-ref`}
            name="senderReference"
            placeholder="From your bank or wallet app"
            aria-invalid={error('senderReference') ? true : undefined}
          />
          <FieldError>{error('senderReference')}</FieldError>
        </div>

        {/* Cash at the counter produces no screenshot, so the upload is only
            offered where one can exist. */}
        {method !== 'cash' && (
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-proof`}>Receipt screenshot</Label>
            <input
              id={`${formId}-proof`}
              name="proof"
              type="file"
              accept="image/*"
              className="w-full cursor-pointer rounded-xl border border-ink-200 bg-white px-4 py-2.5 font-sans text-sm text-ink-700 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-sans file:text-sm file:font-semibold file:text-brand-800 hover:border-ink-300"
              aria-describedby={`${formId}-proof-hint`}
            />
            <FieldHint id={`${formId}-proof-hint`}>
              A photo or screenshot, up to 8MB. Optional, but it lets us confirm much faster.
            </FieldHint>
            <FieldError>{error('proof')}</FieldError>
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-note`}>Anything we should know?</Label>
          <Textarea
            id={`${formId}-note`}
            name="note"
            rows={3}
            placeholder="Optional — e.g. paid in two instalments"
            aria-invalid={error('note') ? true : undefined}
          />
          <FieldError>{error('note')}</FieldError>
        </div>

        <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Sending
            </>
          ) : (
            <>
              <Send aria-hidden />
              Submit for confirmation
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}

/**
 * "Not ready to pay yet" — records a pending seat and nothing else.
 *
 * Worth having as its own action rather than treating an abandoned checkout as
 * the same thing. A student who intends to pay next week is a lead the
 * admissions team can call; a closed browser tab is not.
 */
export function ReserveSeatButton({ slug }: { slug: string }) {
  const [pending, startTransition] = React.useTransition()
  const [result, setResult] = React.useState<{ ok: boolean; error?: string } | null>(null)

  if (result?.ok) {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-center font-sans text-[0.875rem] font-medium text-emerald-800">
        <CheckCircle2 aria-hidden className="size-4" />
        Seat reserved — we will call you about the fee.
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        size="md"
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const outcome = await reserveCourseSeat(slug)
            setResult(outcome.ok ? { ok: true } : { ok: false, error: outcome.error })
          })
        }
      >
        {pending ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Reserving
          </>
        ) : (
          <>
            <Upload aria-hidden />
            Reserve my seat, I will pay later
          </>
        )}
      </Button>
      <FieldError>{result?.error}</FieldError>
    </div>
  )
}
