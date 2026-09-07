import { Badge } from '@/components/ui/badge'
import type { EnrollmentStatus, PaymentStatus, SubscriptionStatus } from '@/db/schema'

/**
 * One place where a stored status becomes a colour and a phrase.
 *
 * Both matter, and the phrasing is not decoration. `pending` is the state most
 * students will spend the longest in, and "Pending" alone reads like something
 * has stalled — so it says "Awaiting payment confirmation", which is a fact
 * about what happens next rather than a label with no verb. The same status
 * appears in the admin, where the audience is different and the shorter word is
 * the right one, so the admin has its own mapping.
 */

const ENROLLMENT: Record<EnrollmentStatus, { label: string; variant: 'brand' | 'gold' | 'neutral' | 'success' | 'outline' }> = {
  pending: { label: 'Awaiting confirmation', variant: 'gold' },
  active: { label: 'Enrolled', variant: 'success' },
  completed: { label: 'Completed', variant: 'brand' },
  rejected: { label: 'Not confirmed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
}

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const { label, variant } = ENROLLMENT[status]
  return (
    <Badge variant={variant} size="md">
      {label}
    </Badge>
  )
}

const PAYMENT: Record<PaymentStatus, { label: string; variant: 'gold' | 'success' | 'outline' }> = {
  submitted: { label: 'Under review', variant: 'gold' },
  approved: { label: 'Confirmed', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'outline' },
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, variant } = PAYMENT[status]
  return (
    <Badge variant={variant} size="md">
      {label}
    </Badge>
  )
}

const SUBSCRIPTION: Record<
  SubscriptionStatus,
  { label: string; variant: 'gold' | 'success' | 'neutral' | 'outline' }
> = {
  pending: { label: 'Awaiting confirmation', variant: 'gold' },
  active: { label: 'Active', variant: 'success' },
  expired: { label: 'Expired', variant: 'neutral' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const { label, variant } = SUBSCRIPTION[status]
  return (
    <Badge variant={variant} size="md">
      {label}
    </Badge>
  )
}
