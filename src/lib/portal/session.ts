import 'server-only'

import { redirect } from 'next/navigation'

import type { PortalRole, PortalUserRow } from '@/db/schema'
import { getPortalUser } from '@/lib/data/portal'
import { requireInstructor, requirePortalUser, requireStudent } from '@/lib/portal/guard'

/**
 * The check every portal *layout* runs, as opposed to the one every action
 * runs.
 *
 * `guard.ts` answers "is this session signed in as the right role", which it
 * can do from the JWT alone. That is the right question for a server action —
 * it is cheap and it happens on every POST. It is not sufficient for a page,
 * because a JWT is valid for twelve hours and says nothing about what has
 * happened to the account since it was issued.
 *
 * So this reads the row. Suspending an account takes effect on the next page
 * view rather than at the next sign-in, and an admin-provisioned temporary
 * password cannot be carried around indefinitely.
 */

export type PortalAccount = {
  id: string
  role: PortalRole
  account: PortalUserRow
}

async function load(
  principal: { id: string; role: PortalRole },
  allowPasswordChange: boolean,
): Promise<PortalAccount> {
  const account = await getPortalUser(principal.id)

  /* Deleted out from under a live session. Sending them to the login rather
     than erroring is what makes the next sign-in attempt explain itself. */
  if (!account) redirect('/portal/login')

  if (account.status !== 'active') redirect('/portal/suspended')

  /* `/portal/password` is the one page a must-change account may open, or the
     redirect would be a loop. */
  if (account.mustChangePassword && !allowPasswordChange) redirect('/portal/password')

  return { id: account.id, role: account.role, account }
}

export async function requireStudentAccount(): Promise<PortalAccount> {
  return load(await requireStudent(), false)
}

export async function requireInstructorAccount(): Promise<PortalAccount> {
  return load(await requireInstructor(), false)
}

/** Either role, and tolerant of the must-change flag — for `/portal/*` itself. */
export async function requireAnyPortalAccount(): Promise<PortalAccount> {
  return load(await requirePortalUser(), true)
}
