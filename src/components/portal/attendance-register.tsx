'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/db/schema'
import type { PortalActionResult } from '@/lib/portal/guard'
import { cn } from '@/lib/utils'

export type RegisterRow = {
  studentId: string
  name: string
  email: string
  status: AttendanceStatus | null
  note: string | null
}

const LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
}

const SELECTED: Record<AttendanceStatus, string> = {
  present: 'border-emerald-600 bg-emerald-600 text-white',
  late: 'border-gold-500 bg-gold-500 text-brand-950',
  absent: 'border-red-500 bg-red-500 text-white',
  excused: 'border-ink-500 bg-ink-500 text-white',
}

/**
 * Taking the register.
 *
 * A segmented control per student rather than a dropdown: marking a class of
 * thirty is a repetitive job done at the start of a lesson, often on a phone,
 * and four visible targets beat four hidden ones behind a select. "Mark all
 * present" exists because it is the honest common case — the register is
 * usually a list of exceptions.
 *
 * Nothing is written until Save. The whole sheet is submitted at once so a
 * half-finished register never reaches the database.
 */
export function AttendanceRegister({
  rows,
  onSave,
}: {
  rows: RegisterRow[]
  onSave: (
    marks: { studentId: string; status: AttendanceStatus; note?: string | null }[],
  ) => Promise<PortalActionResult>
}) {
  const router = useRouter()
  const [marks, setMarks] = React.useState<Record<string, AttendanceStatus | null>>(() =>
    Object.fromEntries(rows.map((row) => [row.studentId, row.status])),
  )
  const [notes, setNotes] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.studentId, row.note ?? ''])),
  )
  const [pending, setPending] = React.useState(false)

  const marked = rows.filter((row) => marks[row.studentId] != null).length

  function setAll(status: AttendanceStatus) {
    setMarks(Object.fromEntries(rows.map((row) => [row.studentId, status])))
  }

  async function save() {
    const payload = rows
      .map((row) => ({
        studentId: row.studentId,
        status: marks[row.studentId],
        note: notes[row.studentId]?.trim() || null,
      }))
      /* Unmarked students are omitted rather than defaulted. "Not marked" and
         "marked absent" are different claims about a person, and only one of
         them belongs in a record the student can see. */
      .filter((row): row is { studentId: string; status: AttendanceStatus; note: string | null } =>
        row.status !== null && row.status !== undefined,
      )

    if (payload.length === 0) {
      toast.error('Nothing to save', { description: 'Mark at least one student first.' })
      return
    }

    setPending(true)
    const result = await onSave(payload)
    setPending(false)

    if (!result.ok) {
      toast.error('Could not save the register', { description: result.error })
      return
    }

    toast.success('Register saved', {
      description: `${payload.length} of ${rows.length} students marked.`,
    })
    router.refresh()
  }

  if (rows.length === 0) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="font-sans text-[0.9375rem] text-ink-500">
          Nobody is enrolled on this batch yet, so there is no register to take.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="font-sans text-sm font-semibold text-ink-700">
          {marked} of {rows.length} marked
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setAll('present')}>
            Mark all present
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMarks(Object.fromEntries(rows.map((row) => [row.studentId, null])))}
          >
            Clear
          </Button>
        </div>
      </Card>

      <div className="grid gap-3">
        {rows.map((row) => {
          const current = marks[row.studentId]

          return (
            <Card key={row.studentId} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[0.9375rem] font-bold text-ink-900">{row.name}</p>
                  <p className="truncate font-sans text-xs text-ink-400">{row.email}</p>
                </div>

                <div
                  role="radiogroup"
                  aria-label={`Attendance for ${row.name}`}
                  className="flex flex-wrap gap-1.5"
                >
                  {ATTENDANCE_STATUSES.map((status) => {
                    const selected = current === status

                    return (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={pending}
                        onClick={() =>
                          setMarks((value) => ({
                            ...value,
                            [row.studentId]: selected ? null : status,
                          }))
                        }
                        className={cn(
                          'rounded-lg border-2 px-3 py-1.5 font-sans text-xs font-bold transition-colors',
                          'focus-visible:ring-4 focus-visible:ring-brand-600/15 focus-visible:outline-none',
                          selected
                            ? SELECTED[status]
                            : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                        )}
                      >
                        {LABEL[status]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(current === 'excused' || current === 'late' || notes[row.studentId]) && (
                <Input
                  className="mt-3 h-10 text-[0.875rem]"
                  placeholder="Note — the reason, if there is one"
                  value={notes[row.studentId] ?? ''}
                  disabled={pending}
                  aria-label={`Note for ${row.name}`}
                  onChange={(event) =>
                    setNotes((value) => ({ ...value, [row.studentId]: event.target.value }))
                  }
                />
              )}
            </Card>
          )
        })}
      </div>

      <Card className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="font-sans text-[0.875rem] text-ink-600">
          {marked === rows.length
            ? 'Everyone is marked.'
            : `${rows.length - marked} student${rows.length - marked === 1 ? '' : 's'} not marked — they will be left blank.`}
        </p>

        <Button type="button" variant="primary" size="lg" disabled={pending} onClick={save}>
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Saving
            </>
          ) : (
            <>
              Save register
              <Save aria-hidden />
            </>
          )}
        </Button>
      </Card>
    </div>
  )
}
