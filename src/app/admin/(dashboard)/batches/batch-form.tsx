'use client'

import type * as React from 'react'

import { SimpleForm } from '@/components/admin/simple-form'
import { batchSchema, type BatchValues } from '@/lib/portal/schemas'

/**
 * A Zod schema is a class instance, not a plain object, so it cannot cross the
 * Server->Client props boundary (`batchSchema` was previously passed straight
 * from the server page components, which throws in production: "Only plain
 * objects ... can be passed to Client Components"). Importing it here instead,
 * inside the client module graph, avoids the boundary entirely.
 *
 * Same convention as `author-form.tsx`, `faq-form.tsx`, `gallery-form.tsx` and
 * `testimonial-form.tsx` — see the note on `SimpleForm` before adding another.
 */
export function BatchForm(
  props: Omit<React.ComponentProps<typeof SimpleForm<BatchValues>>, 'schema'>,
) {
  /* `as never` because the schema's `.default()` fields make its *input* type
     differ from `BatchValues`, which is its output. Unrelated to the boundary
     bug above — it was on the original call sites too. */
  return <SimpleForm<BatchValues> schema={batchSchema as never} {...props} />
}
