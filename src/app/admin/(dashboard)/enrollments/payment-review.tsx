'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Receipt, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { Badge } from '@/components/ui/badge'
import type { PaymentWithStudent } from '@/lib/data/enrollments'
import { PAYMENT_METHOD_LABELS } from '@/lib/payments'
import { formatDate, formatPKR } from '@/lib/utils'

import { approvePayment, rejectPayment } from './actions'

/**
 * One claim in the review queue.
 *
 * The approve button is the single control in this application that grants
 * access, so it is deliberately not a one-click affordance buried in a table
 * row: the receipt, the amount, the sender and what it buys are all on screen
 * next to it. Rejection is a two-step — the reason box opens first — because a
 * rejection with no reason is the one outcome that reliably produces an angry
 * phone call.
 */
export function PaymentReviewCard({ claim }: { claim: PaymentWithStudent }) {
  const router = useRouter()
  const { payment, student, enrollment, subscription } = claim

  const [pending, startTransition] = React.useTransition()
  const [rejecting, setRejecting] = React.useState(false)
  const [reason, setReason] = React.useState('')

  const buys = enrollment?.courseTitle ?? subscription?.planName ?? 'Unknown item'

  /* Keyed by payment id, not by filename — the stored name never reaches the
     browser, so there is nothing to guess and nothing to share by accident. */
  const receiptUrl = `/admin/enrollments/receipt/${payment.id}`

  function onApprove() {
    startTransition(async () => {
      const result = await approvePayment(payment.id)

      if (!result.ok) {
        toast.error('Could not approve', { description: result.error })
        return
      }

      toast.success(`${formatPKR(payment.amount)} approved`, {
        description: `${student?.name ?? 'The student'} now has access to ${buys}.`,
      })
      router.refresh()
    })
  }

  function onReject() {
    startTransition(async () => {
      const result = await rejectPayment(payment.id, reason)

      if (!result.ok) {
        toast.error('Could not reject', { description: result.error })
        return
      }

      toast.success('Payment rejected', { description: 'The student can see your reason.' })
      setRejecting(false)
      setReason('')
      router.refresh()
    })
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-sans text-lg font-extrabold text-ink-900">
              {formatPKR(payment.amount)}
            </p>
            <Badge variant="neutral" size="sm">
              {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
            </Badge>
            <span className="font-mono text-xs text-ink-400">{payment.reference}</span>
          </div>

          <p className="mt-2 font-sans text-[0.9375rem] font-semibold text-ink-800">{buys}</p>

          <dl className="mt-3 grid gap-1.5 font-sans text-[0.8125rem] text-ink-600">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-ink-400">Student</dt>
              <dd className="font-medium text-ink-800">
                {student?.name ?? 'Unknown'}
                {student?.email && <span className="text-ink-500"> · {student.email}</span>}
              </dd>
            </div>

            {student?.phone && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-ink-400">Phone</dt>
                <dd>
                  <a href={`tel:${student.phone}`} className="font-medium hover:text-brand-800">
                    {student.phone}
                  </a>
                </dd>
              </div>
            )}

            <div className="flex flex-wrap gap-x-2">
              <dt className="text-ink-400">Sent by</dt>
              <dd className="font-medium text-ink-800">{payment.senderName ?? '—'}</dd>
            </div>

            {payment.senderReference && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-ink-400">Transaction ID</dt>
                <dd className="font-mono text-xs">{payment.senderReference}</dd>
              </div>
            )}

            <div className="flex flex-wrap gap-x-2">
              <dt className="text-ink-400">Submitted</dt>
              <dd>{formatDate(payment.createdAt)}</dd>
            </div>
          </dl>

          {payment.note && (
            <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-[0.8125rem] leading-relaxed text-ink-700">
              “{payment.note}”
            </p>
          )}
        </div>

        {/* ------------------------------------------------------- receipt -- */}
        {payment.proofPath ? (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block w-full overflow-hidden rounded-xl ring-1 ring-hairline sm:w-40"
            aria-label="Open the full-size receipt"
          >
            {/*
              A plain <img>, not next/image.

              The image optimiser fetches the source itself, server-side, with
              none of the admin's cookies — so against an authenticated route it
              gets a 401 and the receipt renders as a broken image. Receipts are
              private by design (see `@/lib/receipts`), which puts them outside
              what the optimiser can ever see.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptUrl}
              alt={`Receipt for ${payment.reference}`}
              loading="lazy"
              className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-ink-900/70 py-1 text-center font-sans text-[0.6875rem] font-semibold text-white">
              View full size
            </span>
          </a>
        ) : (
          <div className="grid w-full place-items-center rounded-xl bg-ink-50 p-6 text-center ring-1 ring-hairline ring-inset sm:w-40">
            <Receipt aria-hidden className="size-6 text-ink-300" />
            <p className="mt-2 font-sans text-xs text-ink-500">
              {payment.method === 'cash' ? 'Paid at the campus' : 'No receipt attached'}
            </p>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------- actions -- */}
      {rejecting ? (
        <div className="mt-5 grid gap-3 border-t border-hairline pt-5">
          <Textarea
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this being rejected? The student will see this."
            aria-label="Reason for rejection"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pending || reason.trim().length < 4}
              onClick={onReject}
            >
              {pending ? <Loader2 aria-hidden className="animate-spin" /> : <X aria-hidden />}
              Confirm rejection
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setRejecting(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-5">
          <Button type="button" variant="primary" size="sm" disabled={pending} onClick={onApprove}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
            Approve &amp; grant access
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setRejecting(true)}
          >
            <X aria-hidden />
            Reject
          </Button>
        </div>
      )}
    </Card>
  )
}
