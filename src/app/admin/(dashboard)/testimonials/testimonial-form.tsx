'use client'

import type * as React from 'react'

import { SimpleForm } from '@/components/admin/simple-form'
import { testimonialFormSchema, type TestimonialFormValues } from '@/lib/admin/schemas'

/**
 * A Zod schema is a class instance, not a plain object, so it can't cross the
 * Server->Client props boundary (`testimonialFormSchema` was previously passed
 * straight from the server page component, which throws in production: "Only
 * plain objects ... can be passed to Client Components"). Importing it here
 * instead, inside the client module graph, avoids the boundary entirely.
 */
export function TestimonialForm(
  props: Omit<React.ComponentProps<typeof SimpleForm<TestimonialFormValues>>, 'schema'>,
) {
  return <SimpleForm schema={testimonialFormSchema} {...props} />
}
