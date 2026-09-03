import type { Metadata } from 'next'
import { revalidatePath } from 'next/cache'

import { AdminPageHeader as PageHeader } from '@/components/admin/page-header'
import { AttendanceRegister } from '@/components/portal/attendance-register'
import { formatDateTime } from '@/components/portal/ui'
import type { AttendanceStatus } from '@/db/schema'
import { getAttendanceSheet, saveAttendance } from '@/lib/data/instructor'
import { orNotFound, runPortalAction, type PortalActionResult } from '@/lib/portal/guard'
import { attendanceMarkSchema } from '@/lib/portal/schemas'
import { requireInstructorAccount } from '@/lib/portal/session'

export const metadata: Metadata = { title: 'Take the register' }

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  const { id } = await requireInstructorAccount()

  const sheet = await orNotFound(getAttendanceSheet(id, sessionId))

  async function save(
    marks: { studentId: string; status: AttendanceStatus; note?: string | null }[],
  ): Promise<PortalActionResult> {
    'use server'

    return runPortalAction('instructor', async (user) => {
      /* Re-validated server side even though the UI only offers four buttons —
         the payload is whatever the browser chose to send. */
      const parsed = marks.map((mark) => {
        const result = attendanceMarkSchema.safeParse(mark)
        if (!result.success) throw new Error(result.error.issues[0].message)
        return result.data
      })

      await saveAttendance(user.id, sessionId, parsed)

      revalidatePath(`/instructor/sessions/${sessionId}/attendance`)
      revalidatePath(`/instructor/batches/${sheet.batch.id}`)
      revalidatePath('/instructor/attendance')
      revalidatePath('/instructor')

      return `${parsed.length} student${parsed.length === 1 ? '' : 's'} marked`
    })
  }

  return (
    <>
      <PageHeader
        backHref={`/instructor/batches/${sheet.batch.id}`}
        backLabel={sheet.batch.name}
        title={sheet.session.title}
        description={`${sheet.batch.courseTitle} · ${formatDateTime(sheet.session.scheduledAt)}${
          sheet.session.attendanceMarkedAt
            ? ` · register last saved ${formatDateTime(sheet.session.attendanceMarkedAt)}`
            : ''
        }`}
      />

      <AttendanceRegister
        rows={sheet.rows.map((row) => ({
          studentId: row.student.studentId,
          name: row.student.studentName,
          email: row.student.studentEmail,
          status: row.status,
          note: row.note,
        }))}
        onSave={save}
      />
    </>
  )
}
