'use server'

import { randomBytes, randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'

import { signIn, signOut } from '@/auth'
import { getDb, isDatabaseConfigured, pingDatabase } from '@/db'
import { enrollments, payments, students, subscriptions } from '@/db/schema'
import { getCampaign } from '@/lib/data/campaign'
import { getCourseBySlug } from '@/lib/data/courses'
import { getPlanRowBySlug } from '@/lib/data/plans'
import { discountedFee } from '@/lib/courses'
import { saveReceiptImage } from '@/lib/receipts'
import { getStudentSession, runStudentAction } from '@/lib/student/guard'
import { paymentProofSchema, signupSchema } from '@/lib/validations'

/**
 * Student-facing mutations: creating an account, reserving a seat, and filing a
 * payment claim.
 *
 * Two rules hold throughout, and they are the reason this file is worth reading
 * before changing:
 *
 *   1. **Money is never taken from the client.** Every amount is recomputed
 *      here from the live catalogue and the live campaign discount. A form that
 *      posts its own price is a form that can post `1`.
 *   2. **Nothing here grants access.** These actions can only ever produce a
 *      `pending` enrollment and a `submitted` payment. `active` is reachable
 *      exclusively from the admin review screen — see
 *      `src/app/admin/(dashboard)/enrollments/actions.ts`.
 */

/* -------------------------------------------------------------- Sign up --- */

export type SignupState = {
  error?: string
  /** Keyed by field name, rendered under the matching input. */
  errors?: Record<string, string>
  /** Echoed back so a failed submit does not blank the form. */
  values?: { name?: string; email?: string; phone?: string; city?: string }
}

/**
 * `useActionState` + `FormData` rather than react-hook-form, matching the admin
 * sign-in form: the password never enters component state, and the schema is
 * only ever constructed on the server — which also keeps it clear of the
 * Server→Client props boundary that a zod schema cannot cross.
 */
export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    city: String(formData.get('city') ?? ''),
    password: String(formData.get('password') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
    website: String(formData.get('website') ?? ''),
    consent: formData.get('consent') === 'on',
  }

  /* Echoed on every failure path below. The password fields are deliberately
     absent — re-typing a password is a smaller cost than putting it back in the
     HTML of a page that just failed. */
  const values = { name: raw.name, email: raw.email, phone: raw.phone, city: raw.city }

  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      errors[key] ??= issue.message
    }
    return { errors, values }
  }

  /* Honeypot. A bot that fills every field gets a success-shaped answer and no
     row, because telling it which check it failed is how it learns to pass. */
  if (parsed.data.website) redirect('/dashboard')

  if (!isDatabaseConfigured()) {
    return { error: 'Accounts are unavailable right now. Please contact us on WhatsApp.', values }
  }

  const { name, email, phone, city, password } = parsed.data

  try {
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 12)

    await getDb()
      .insert(students)
      .values({
        id: randomUUID(),
        email,
        name,
        phone,
        city: city || null,
        passwordHash,
      })
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) {
      return {
        errors: { email: 'An account with this email already exists — sign in instead.' },
        values,
      }
    }

    console.error('[account] signup failed', error)
    const health = await pingDatabase()
    return {
      error: health.ok
        ? 'Could not create your account. Please try again.'
        : `Accounts are unavailable: ${health.reason}.`,
      values,
    }
  }

  /* Straight into a session — an account you have to sign into immediately
     after creating is a step that exists only to be resented. */
  await signIn('student', { email, password, redirectTo: nextTarget(formData) })

  return {}
}

/* --------------------------------------------------------------- Log in --- */

export type LoginState = { error?: string; values?: { email?: string } }

export async function studentLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Enter your email and password.', values: { email } }
  }

  if (!isDatabaseConfigured()) {
    return { error: 'Sign-in is unavailable right now. Please try again shortly.', values: { email } }
  }

  try {
    await signIn('student', {
      email: email.toLowerCase(),
      password,
      redirectTo: nextTarget(formData),
    })
  } catch (error) {
    if (isRedirect(error)) throw error

    /* Auth.js collapses every `authorize` failure into one opaque error, so a
       dead database and a typo arrive here looking identical. Probing on the
       failure path only is what separates them — the same reasoning as the
       admin sign-in page. */
    const health = await pingDatabase()
    if (!health.ok) {
      console.error('[account] sign-in blocked by database outage —', health.reason)
      return { error: `Sign-in is unavailable: ${health.reason}.`, values: { email } }
    }

    return { error: 'Those details did not match an account.', values: { email } }
  }

  return {}
}

export async function studentSignOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' })
}

/* ------------------------------------------------------------ Enrolling --- */

/**
 * What a course costs this minute: the standard fee with the live campaign
 * discount applied, exactly as the catalogue and course page display it.
 *
 * Read here, on the server, at the moment of writing — never accepted from the
 * form. The price a student was shown and the price recorded against them can
 * differ by a campaign that ended in between, and the honest resolution is the
 * one the site is advertising right now.
 */
async function priceCourse(slug: string) {
  const [course, campaign] = await Promise.all([getCourseBySlug(slug), getCampaign()])
  if (!course) return null

  return {
    course,
    amount: discountedFee(course, campaign.discountPercent),
  }
}

/**
 * Reserve a seat without paying yet.
 *
 * Idempotent on `(studentId, courseSlug)`: someone who clicks twice, or comes
 * back a week later, updates the row they already have rather than creating a
 * second one. A previously `rejected` or `cancelled` enrollment returns to
 * `pending` here, which is the whole reason re-applying works at all — but an
 * `active` one is left strictly alone, so this can never quietly revoke access
 * that an admin has already granted.
 */
export async function reserveCourseSeat(courseSlug: string) {
  return runStudentAction(async (student) => {
    const priced = await priceCourse(courseSlug)
    if (!priced) throw new Error('That course is no longer available.')

    const db = getDb()

    const [existing] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.studentId, student.id), eq(enrollments.courseSlug, courseSlug)))
      .limit(1)

    if (existing) {
      /* Never touch a seat that has already been granted. Re-pricing or
         re-pending an active enrollment would revoke access somebody has
         already paid for, from a button labelled "enroll". */
      if (existing.status === 'active' || existing.status === 'completed') return

      await db
        .update(enrollments)
        .set({
          status: 'pending',
          courseTitle: priced.course.title,
          amount: priced.amount,
          updatedAt: new Date(),
        })
        .where(eq(enrollments.id, existing.id))

      revalidatePath('/dashboard')
      return
    }

    /*
     * Read-then-write, rather than one `ON CONFLICT DO UPDATE` with a CASE.
     *
     * That form would be atomic, but Drizzle renders the self-reference inside
     * `DO UPDATE SET` schema-qualified — `"globify_site"."enrollments"."status"`
     * — and this schema has no migrated database to verify that against. An
     * unverified construct is not what should be holding the line between a
     * student paying and a student having access.
     *
     * The race it gives up is real but narrow: the same student double-clicking
     * enroll. The unique index still refuses the second row, so the outcome is
     * one seat either way — this just catches the resulting error and treats it
     * as what it is, a seat that already exists.
     */
    try {
      await db.insert(enrollments).values({
        id: randomUUID(),
        studentId: student.id,
        courseSlug,
        courseTitle: priced.course.title,
        amount: priced.amount,
        status: 'pending',
        source: 'course',
      })
    } catch (error) {
      const duplicate =
        error instanceof Error && /duplicate key|unique constraint/i.test(error.message)
      if (!duplicate) throw error
    }

    revalidatePath('/dashboard')
  })
}

/* ---------------------------------------------------------- Subscribing --- */

/**
 * Start an all-access subscription. Unlike a seat, this always inserts: a
 * renewal is a new row, so `subscriptions` is its own billing history and no
 * term is ever rewritten in place.
 *
 * Returns the id so checkout can attach the payment claim to this exact
 * purchase rather than guessing at "the student's latest".
 */
export async function startPlanSubscription(
  planSlug: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const student = await getStudentSession()
  if (!student) return { ok: false, error: 'Please sign in to continue.' }

  try {
    const plan = await getPlanRowBySlug(planSlug)
    if (!plan || !plan.active) return { ok: false, error: 'That plan is no longer available.' }

    /* An existing pending subscription for the same plan is reused, so a
       student who reloads checkout does not accumulate abandoned rows. */
    const [existing] = await getDb()
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.studentId, student.id),
          eq(subscriptions.planId, plan.id),
          eq(subscriptions.status, 'pending'),
        ),
      )
      .limit(1)

    if (existing) return { ok: true, id: existing.id }

    const id = randomUUID()
    await getDb().insert(subscriptions).values({
      id,
      studentId: student.id,
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      interval: plan.interval,
      amount: plan.price,
      status: 'pending',
    })

    revalidatePath('/dashboard')
    return { ok: true, id }
  } catch (error) {
    console.error('[account] starting a subscription failed', error)
    return { ok: false, error: 'Could not start that plan. Please try again.' }
  }
}

/* ------------------------------------------------------------- Payments --- */

export type PaymentState = {
  error?: string
  errors?: Record<string, string>
  ok?: boolean
}

/**
 * File a payment claim: "I sent the money, here is the receipt."
 *
 * This is the only thing a student can do about money on this site, and it
 * grants nothing. It writes a `submitted` row for an admin to judge, which is
 * the honest shape of a bank transfer — the site genuinely does not know
 * whether the money arrived, and a status that claimed otherwise would be a
 * lie the accounts team has to clean up.
 */
export async function submitPaymentProof(
  _prev: PaymentState,
  formData: FormData,
): Promise<PaymentState> {
  const student = await getStudentSession()
  if (!student) return { error: 'Please sign in to continue.' }

  const purpose = String(formData.get('purpose') ?? '')
  const slug = String(formData.get('slug') ?? '')

  if (purpose !== 'course' && purpose !== 'plan') {
    return { error: 'Something went wrong. Please reload the page and try again.' }
  }

  const parsed = paymentProofSchema.safeParse({
    method: String(formData.get('method') ?? ''),
    senderName: String(formData.get('senderName') ?? ''),
    senderReference: String(formData.get('senderReference') ?? ''),
    note: String(formData.get('note') ?? ''),
  })

  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form')
      errors[key] ??= issue.message
    }
    return { errors }
  }

  try {
    /* The amount and the thing being bought are both resolved server-side. The
       form contributes a slug and nothing else that costs money. */
    let amount: number
    let enrollmentId: string | null = null
    let subscriptionId: string | null = null

    if (purpose === 'course') {
      const priced = await priceCourse(slug)
      if (!priced) return { error: 'That course is no longer available.' }

      const seat = await reserveCourseSeat(slug)
      if (!seat.ok) return { error: seat.error }

      const [row] = await getDb()
        .select({ id: enrollments.id, status: enrollments.status })
        .from(enrollments)
        .where(
          and(eq(enrollments.studentId, student.id), eq(enrollments.courseSlug, slug)),
        )
        .limit(1)

      if (!row) return { error: 'Could not find your enrollment. Please try again.' }

      /*
       * The checkout page already hides the form once a seat is active, but a
       * server action is its own endpoint — a stale tab left open through an
       * approval reaches this with the page's own hidden fields. Refusing here
       * is what stops a student paying twice for the same course, which is the
       * one mistake in this flow that costs them real money.
       */
      if (row.status === 'active' || row.status === 'completed') {
        return { error: 'You are already enrolled in this course — there is nothing more to pay.' }
      }

      amount = priced.amount
      enrollmentId = row.id
    } else {
      const plan = await getPlanRowBySlug(slug)
      if (!plan || !plan.active) return { error: 'That plan is no longer available.' }

      const started = await startPlanSubscription(slug)
      if (!started.ok) return { error: started.error }

      amount = plan.price
      subscriptionId = started.id
    }

    /* Optional: a student who paid at the campus counter has no screenshot to
       show, and refusing the claim would only push them back to WhatsApp. */
    let proofPath: string | null = null
    const file = formData.get('proof')

    if (file instanceof File && file.size > 0) {
      /* Not `saveUploadedImage` — that writes into `public/`, and a receipt is
         somebody's bank details. This one stores privately and hands back a
         bare filename. */
      const upload = await saveReceiptImage(file)
      if (!upload.ok) return { errors: { proof: upload.error } }
      proofPath = upload.filename
    }

    await getDb()
      .insert(payments)
      .values({
        id: randomUUID(),
        reference: paymentReference(),
        studentId: student.id,
        purpose,
        enrollmentId,
        subscriptionId,
        amount,
        method: parsed.data.method,
        senderName: parsed.data.senderName,
        senderReference: parsed.data.senderReference || null,
        proofPath,
        note: parsed.data.note || null,
        status: 'submitted',
      })

    revalidatePath('/dashboard')
    return { ok: true }
  } catch (error) {
    console.error('[account] payment claim failed', error)
    return { error: 'Could not record your payment. Please try again, or send us the receipt on WhatsApp.' }
  }
}

/* -------------------------------------------------------------- Helpers --- */

/** `GT-PAY-7QK2M4` — short enough to read down a phone line. */
function paymentReference(): string {
  /* No I, O, 0 or 1: this gets read aloud and written on deposit slips, and
     those are the characters that come back wrong. */
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (const byte of randomBytes(6)) suffix += alphabet[byte % alphabet.length]
  return `GT-PAY-${suffix}`
}

/**
 * Where to land after signing in.
 *
 * Only a same-site path is ever honoured. `next` arrives from the query string,
 * which anyone can write, and a redirect target that may name a host is an
 * open redirect — the classic way a phishing link borrows a real domain's
 * credibility. A leading `//` is rejected too: browsers read it as
 * protocol-relative, so `//evil.example` is an absolute URL wearing a path's
 * clothing.
 */
function nextTarget(formData: FormData): string {
  const next = String(formData.get('next') ?? '')
  if (next.startsWith('/') && !next.startsWith('//')) return next
  return '/dashboard'
}

/*
 * Not exported. Every export from a `'use server'` module becomes a callable
 * endpoint, so anything that is not meant to be reachable from the browser has
 * to stay private — and Next refuses to build a server-action file that
 * exports a non-async value at all.
 */
function isRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  )
}
