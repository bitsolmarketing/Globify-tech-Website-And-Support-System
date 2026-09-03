import type { SimpleField } from '@/components/admin/simple-form'
import { BATCH_STATUSES } from '@/db/schema'
import type { BatchValues } from '@/lib/portal/schemas'

/**
 * The batch form, shared by the create and edit screens so the two cannot
 * drift — the same mistake the admin's other resources avoid with a `fields.ts`
 * beside each form.
 */
export function batchFields(
  courses: { id: string; title: string }[],
  instructors: { id: string; name: string }[],
): SimpleField<BatchValues>[] {
  return [
    {
      name: 'courseId',
      label: 'Course',
      type: 'select',
      required: true,
      hint: 'The syllabus this batch teaches. Its title is copied onto the batch, so renaming the course later will not retitle old certificates.',
      full: true,
      options: courses.map((course) => ({ value: course.id, label: course.title })),
    },
    {
      name: 'name',
      label: 'Batch name',
      required: true,
      placeholder: 'Full Stack — Spring 2026 evening',
    },
    {
      name: 'code',
      label: 'Code',
      required: true,
      placeholder: 'FSD-2026-A',
      hint: 'Short reference used in conversation. Must be unique.',
    },
    {
      name: 'instructorId',
      label: 'Instructor',
      type: 'select',
      required: true,
      hint:
        instructors.length === 0
          ? 'No instructor accounts yet — create one under Portal accounts first.'
          : 'Only this instructor can see the roster, take the register and mark work.',
      options: instructors.map((instructor) => ({
        value: instructor.id,
        label: instructor.name,
      })),
    },
    {
      name: 'mode',
      label: 'Mode',
      type: 'select',
      options: [
        { value: 'On-campus', label: 'On-campus' },
        { value: 'Online', label: 'Online' },
        { value: 'Hybrid', label: 'Hybrid' },
      ],
    },
    { name: 'startDate', label: 'Start date', type: 'date', required: true },
    { name: 'endDate', label: 'End date', type: 'date', hint: 'Optional.' },
    {
      name: 'schedule',
      label: 'Timetable',
      full: true,
      placeholder: 'Mon & Wed, 6:00–8:00 pm',
      hint: 'Free text — shown to students on their course page.',
    },
    {
      name: 'capacity',
      label: 'Capacity',
      type: 'number',
      min: 0,
      max: 500,
      hint: '0 for no limit.',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: BATCH_STATUSES.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
      })),
    },
    {
      name: 'meetingUrl',
      label: 'Class link',
      type: 'url',
      full: true,
      hint: 'Optional. The standing room link for online or hybrid cohorts.',
    },
    {
      name: 'notes',
      label: 'Internal notes',
      type: 'textarea',
      rows: 3,
      hint: 'Admin only — students and instructors never see this.',
    },
  ]
}
