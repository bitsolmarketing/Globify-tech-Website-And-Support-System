'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FieldHint, Select } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import type { ActionResult } from '@/lib/admin/guard'

/**
 * Enrol one student onto a batch.
 *
 * A select rather than a search box because an institute of this size has tens
 * of student accounts, not thousands — and a list you can scroll is faster than
 * a box you have to spell into. Already-enrolled students are filtered out by
 * the page, so every option here is a valid choice.
 */
export function EnrolStudent({
  students,
  action,
}: {
  students: { id: string; label: string }[]
  action: (studentId: string) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [studentId, setStudentId] = React.useState('')
  const [pending, setPending] = React.useState(false)

  if (students.length === 0) {
    return (
      <FieldHint>
        Every student account is already on this batch. New students can register at
        /portal/register, or you can create an account under Portal accounts.
      </FieldHint>
    )
  }

  async function enrol() {
    if (!studentId) {
      toast.error('Choose a student first')
      return
    }

    setPending(true)
    const result = await action(studentId)
    setPending(false)

    if (!result.ok) {
      toast.error('Could not enrol', { description: result.error })
      return
    }

    toast.success('Student enrolled', { description: 'Their dashboard updates immediately.' })
    setStudentId('')
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <Select
          aria-label="Student to enrol"
          placeholder="Choose a student"
          value={studentId}
          disabled={pending}
          onChange={(event) => setStudentId(event.target.value)}
          options={students.map((student) => ({ value: student.id, label: student.label }))}
        />
      </div>

      <Button type="button" variant="primary" size="md" disabled={pending} onClick={enrol}>
        {pending ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Enrolling
          </>
        ) : (
          <>
            <UserPlus aria-hidden />
            Enrol
          </>
        )}
      </Button>
    </div>
  )
}
