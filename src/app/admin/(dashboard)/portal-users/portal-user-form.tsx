'use client'

import type * as React from 'react'

import { SimpleForm } from '@/components/admin/simple-form'
import type { PortalRole } from '@/db/schema'
import { portalUserSchema } from '@/lib/portal/schemas'

/** The editable half of a portal account — the shape the form round-trips. */
export type PortalAccountValues = {
  name: string
  email: string
  role: PortalRole
  status: 'active' | 'suspended'
  authorSlug?: string
  phone?: string
  headline?: string
}

/**
 * A Zod schema is a class instance, not a plain object, so it cannot cross the
 * Server->Client props boundary (`portalUserSchema` was previously passed
 * straight from the server page component, which throws in production: "Only
 * plain objects ... can be passed to Client Components"). Importing it here
 * instead, inside the client module graph, avoids the boundary entirely.
 *
 * Same convention as `author-form.tsx` and the other CRUD wrappers.
 */
export function PortalUserForm(
  props: Omit<React.ComponentProps<typeof SimpleForm<PortalAccountValues>>, 'schema'>,
) {
  return <SimpleForm<PortalAccountValues> schema={portalUserSchema as never} {...props} />
}
