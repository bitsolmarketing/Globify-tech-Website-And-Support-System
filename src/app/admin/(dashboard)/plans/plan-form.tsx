'use client'

import type * as React from 'react'

import { SimpleForm } from '@/components/admin/simple-form'
import { planFormSchema, type PlanFormValues } from '@/lib/admin/schemas'

/**
 * A Zod schema is a class instance, not a plain object, so it cannot cross the
 * Server→Client props boundary — passing one from a server page throws "Only
 * plain objects … can be passed to Client Components" in production. Importing
 * it here keeps it inside the client module graph, the same convention every
 * other `SimpleForm` resource follows.
 */
export function PlanForm(
  props: Omit<React.ComponentProps<typeof SimpleForm<PlanFormValues>>, 'schema'>,
) {
  return <SimpleForm schema={planFormSchema} {...props} />
}
