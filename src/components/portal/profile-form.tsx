'use client'

import type * as React from 'react'

import { SimpleForm } from '@/components/admin/simple-form'
import { portalProfileSchema } from '@/lib/portal/schemas'

/** The details a portal account may edit about itself. */
export type ProfileValues = {
  name: string
  phone?: string
  headline?: string
  bio?: string
}

/**
 * A Zod schema is a class instance, not a plain object, so it cannot cross the
 * Server->Client props boundary (`portalProfileSchema` was previously passed
 * straight from `profile-page.tsx`, a server component, which throws in
 * production: "Only plain objects ... can be passed to Client Components").
 * Importing it here, inside the client module graph, avoids the boundary.
 *
 * This one is shared ground: `profile-page.tsx` backs both `/student/profile`
 * and `/instructor/profile`, so the bug took out the profile screen for both
 * roles at once.
 */
export function ProfileForm(
  props: Omit<React.ComponentProps<typeof SimpleForm<ProfileValues>>, 'schema'>,
) {
  return <SimpleForm<ProfileValues> schema={portalProfileSchema as never} {...props} />
}
