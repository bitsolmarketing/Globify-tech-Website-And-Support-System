'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Td, Tr } from '@/components/admin/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from '@/db/schema'
import type { EnrollmentWithStudent } from '@/lib/data/enrollments'
import { formatDate, formatPKR } from '@/lib/utils'

import { setEnrollmentStatus } from './actions'

const STATUS_OPTIONS = ENROLLMENT_STATUSES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}))

/**
 * The status select is an override, not the main path — most enrollments should
 * reach `active` by an admin approving the payment above, which stamps who did
 * it and when. This exists for the cases the payment flow does not model:
 * scholarships, fees collected before this system existed, courses finished.
 */
export function EnrollmentTableRow({ row }: { row: EnrollmentWithStudent }) {
  const router = useRouter()
  const [status, setStatus] = React.useState<EnrollmentStatus>(row.enrollment.status)
  const [pending, startTransition] = React.useTransition()

  const name = row.student?.name ?? 'Unknown student'

  function onChange(next: EnrollmentStatus) {
    const previous = status
    setStatus(next)

    startTransition(async () => {
      const result = await setEnrollmentStatus(row.enrollment.id, next)

      if (!result.ok) {
        /* Put the select back. Leaving it showing a value the database rejected
           is how an admin comes to believe a seat is active when it is not. */
        setStatus(previous)
        toast.error('Could not update', { description: result.error })
        return
      }

      toast.success(`${name} marked ${next}`)
      router.refresh()
    })
  }

  return (
    <Tr>
      <Td>
        <span className="block font-semibold text-ink-900">{name}</span>
        <span className="block font-sans text-xs text-ink-400">
          {row.student?.email ?? '—'}
        </span>
      </Td>

      <Td>
        <span className="block text-ink-800">{row.enrollment.courseTitle}</span>
        {row.enrollment.source === 'plan' && (
          <Badge variant="brand" size="sm" className="mt-1">
            Via plan
          </Badge>
        )}
      </Td>

      <Td className="hidden whitespace-nowrap md:table-cell">
        {formatPKR(row.enrollment.amount)}
      </Td>

      <Td className="hidden lg:table-cell">
        {row.payment ? (
          <Badge
            variant={
              row.payment.status === 'approved'
                ? 'success'
                : row.payment.status === 'rejected'
                  ? 'outline'
                  : 'gold'
            }
            size="md"
          >
            {row.payment.status}
          </Badge>
        ) : (
          <span className="text-ink-400">No claim</span>
        )}
      </Td>

      <Td>
        <Select
          aria-label={`Enrollment status for ${name}`}
          value={status}
          disabled={pending}
          onChange={(event) => onChange(event.target.value as EnrollmentStatus)}
          options={STATUS_OPTIONS}
          className="h-9 min-w-[8.5rem] text-[0.8125rem]"
        />
      </Td>

      <Td className="hidden whitespace-nowrap lg:table-cell">
        {formatDate(row.enrollment.createdAt)}
      </Td>
    </Tr>
  )
}
