'use client'

import type * as React from 'react'

import { SimpleForm } from '@/components/admin/simple-form'
import type { MaterialType } from '@/db/schema'
import {
  announcementSchema,
  assignmentWithBatchSchema,
  materialSchema,
  sessionSchema,
} from '@/lib/portal/schemas'

/**
 * Client wrappers for the instructor portal's four create screens.
 *
 * A Zod schema is a class instance, not a plain object, so it cannot cross the
 * Server->Client props boundary — each of these schemas was previously passed
 * straight from its server page component into `SimpleForm`, which throws in
 * production: "Only plain objects ... can be passed to Client Components".
 * Importing them here, inside the client module graph, avoids the boundary.
 *
 * The admin colocates one wrapper per resource (`author-form.tsx` and friends).
 * These four live together instead because their pages sit in four different
 * directories and the wrappers are one line each.
 *
 * The value types live here too, so a page and its form cannot drift apart.
 *
 * `as never` on each schema is unrelated to the boundary bug — `.default()`
 * fields make a schema's input type differ from its output, and the casts were
 * already on the original call sites.
 */

export type AssignmentValues = {
  title: string
  brief: string
  attachmentUrl?: string
  dueAt: string
  maxScore: number
  weight: number
  allowLate: boolean
  publish: boolean
  batchId: string
}

export type AnnouncementValues = {
  batchId: string
  title: string
  body: string
  pinned: boolean
}

export type MaterialValues = {
  title: string
  description?: string
  type: MaterialType
  url?: string
  body?: string
  moduleIndex?: number
}

export type SessionValues = {
  title: string
  topic?: string
  scheduledAt: string
  durationMinutes: number
  meetingUrl?: string
}

type Props<T extends Record<string, unknown>> = Omit<
  React.ComponentProps<typeof SimpleForm<T>>,
  'schema'
>

export function AssignmentForm(props: Props<AssignmentValues>) {
  return <SimpleForm<AssignmentValues> schema={assignmentWithBatchSchema as never} {...props} />
}

export function AnnouncementForm(props: Props<AnnouncementValues>) {
  return <SimpleForm<AnnouncementValues> schema={announcementSchema as never} {...props} />
}

export function MaterialForm(props: Props<MaterialValues>) {
  return <SimpleForm<MaterialValues> schema={materialSchema as never} {...props} />
}

export function SessionForm(props: Props<SessionValues>) {
  return <SimpleForm<SessionValues> schema={sessionSchema as never} {...props} />
}
