'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { runAction, type ActionResult } from '@/lib/admin/guard'
import {
  createBatch,
  enrollStudent,
  getPortalUser,
  listCourseOptions,
  setEnrollmentStatus,
  updateBatch,
} from '@/lib/data/portal'
import { batchSchema, enrollmentStatusSchema } from '@/lib/portal/schemas'

/**
 * Batches and enrolments, from the admin side.
 *
 * Instructors run a batch; they do not decide who is on it or which course it
 * teaches. Those are commercial facts — who paid, what they bought — so they
 * live behind the admin login rather than the portal one.
 */

/**
 * The course is chosen by id, but `batches` also stores its slug and title.
 *
 * Resolving them here rather than trusting the form means the denormalised
 * copy always matches a course that exists. See the note on `batches` in the
 * schema for why the copy is kept at all.
 */
async function resolveCourse(courseId: string) {
  const course = (await listCourseOptions()).find((row) => row.id === courseId)
  if (!course) throw new Error('That course no longer exists. Pick another.')
  return course
}

async function assertInstructor(instructorId: string) {
  const instructor = await getPortalUser(instructorId)
  if (!instructor || instructor.role !== 'instructor') {
    throw new Error('That instructor account no longer exists.')
  }
}

export async function createBatchAction(
  values: z.input<typeof batchSchema>,
): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = batchSchema.parse(values)
    const course = await resolveCourse(parsed.courseId)
    await assertInstructor(parsed.instructorId)

    await createBatch({
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      code: parsed.code,
      name: parsed.name,
      instructorId: parsed.instructorId,
      startDate: parsed.startDate,
      endDate: parsed.endDate || null,
      schedule: parsed.schedule || null,
      mode: parsed.mode,
      capacity: parsed.capacity,
      meetingUrl: parsed.meetingUrl || null,
      status: parsed.status,
      notes: parsed.notes || null,
    })

    revalidatePath('/admin/batches')
    revalidatePath('/instructor')
  })
}

export async function updateBatchAction(
  id: string,
  values: z.input<typeof batchSchema>,
): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = batchSchema.parse(values)
    const course = await resolveCourse(parsed.courseId)
    await assertInstructor(parsed.instructorId)

    await updateBatch(id, {
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      code: parsed.code,
      name: parsed.name,
      instructorId: parsed.instructorId,
      startDate: parsed.startDate,
      endDate: parsed.endDate || null,
      schedule: parsed.schedule || null,
      mode: parsed.mode,
      capacity: parsed.capacity,
      meetingUrl: parsed.meetingUrl || null,
      status: parsed.status,
      notes: parsed.notes || null,
    })

    revalidatePath('/admin/batches')
    revalidatePath(`/admin/batches/${id}`)
    revalidatePath('/instructor')
  })
}

export async function enrollStudentAction(
  batchId: string,
  studentId: string,
): Promise<ActionResult> {
  return runAction(async () => {
    const student = await getPortalUser(studentId)
    if (!student || student.role !== 'student') {
      throw new Error('That is not a student account.')
    }

    await enrollStudent({ batchId, studentId })

    revalidatePath(`/admin/batches/${batchId}`)
    revalidatePath('/student')
    revalidatePath(`/instructor/batches/${batchId}`)
  })
}

export async function setEnrollmentStatusAction(
  batchId: string,
  enrollmentId: string,
  status: string,
): Promise<ActionResult> {
  return runAction(async () => {
    await setEnrollmentStatus(enrollmentId, enrollmentStatusSchema.parse(status))

    revalidatePath(`/admin/batches/${batchId}`)
    revalidatePath('/student')
    revalidatePath(`/instructor/batches/${batchId}`)
  })
}
