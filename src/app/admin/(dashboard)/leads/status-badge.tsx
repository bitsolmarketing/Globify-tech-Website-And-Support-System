import { Badge, type BadgeProps } from '@/components/ui/badge'
import type { LeadStatus } from '@/db/schema'

const VARIANTS: Record<LeadStatus, { variant: BadgeProps['variant']; label: string }> = {
  new: { variant: 'gold', label: 'New' },
  contacted: { variant: 'brand', label: 'Contacted' },
  enrolled: { variant: 'success', label: 'Enrolled' },
  closed: { variant: 'neutral', label: 'Closed' },
}

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { variant, label } = VARIANTS[status]
  return (
    <Badge variant={variant} size="md">
      {label}
    </Badge>
  )
}
