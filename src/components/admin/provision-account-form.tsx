'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react'

import { SelectField, TextField } from '@/components/admin/form-fields'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError } from '@/components/ui/field'

export type ProvisionResult =
  | { ok: true; password: string; email: string }
  | { ok: false; error: string }

/**
 * Creating a portal account, and showing the generated password once.
 *
 * Deliberately not a `SimpleForm`: every other admin form saves and navigates
 * away, and this one has something to say afterwards. The password exists in
 * readable form for exactly this render — it is stored only as a bcrypt hash —
 * so navigating away before it is copied means issuing a new one.
 */
export function ProvisionAccountForm({
  action,
  authorOptions,
}: {
  action: (values: {
    name: string
    email: string
    role: 'student' | 'instructor'
    phone?: string
    headline?: string
    authorSlug?: string
  }) => Promise<ProvisionResult>
  authorOptions: { value: string; label: string }[]
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()
  const [issued, setIssued] = React.useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [role, setRole] = React.useState<'student' | 'instructor'>('instructor')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    setPending(true)
    setError(undefined)

    const result = await action({
      name: String(data.get('name') ?? ''),
      email: String(data.get('email') ?? ''),
      role: (String(data.get('role') ?? 'student') as 'student' | 'instructor'),
      phone: String(data.get('phone') ?? ''),
      headline: String(data.get('headline') ?? ''),
      authorSlug: String(data.get('authorSlug') ?? ''),
    })

    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setIssued({ email: result.email, password: result.password })
    router.refresh()
  }

  if (issued) {
    return (
      <Card className="max-w-2xl p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Check aria-hidden className="size-5" />
          </span>
          <div>
            <h2 className="font-sans text-lg font-bold text-ink-900">Account created</h2>
            <p className="mt-1 text-[0.9375rem] text-ink-500">
              Give these details to {issued.email}. They will be asked to choose their own password
              the first time they sign in.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-ink-50 p-4">
          <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
            Temporary password
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="font-mono text-lg font-bold tracking-wide text-ink-900">
              {issued.password}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(issued.password)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <p className="mt-4 font-sans text-[0.8125rem] text-amber-700">
          This is the only time it is shown. It is stored as a hash, so it cannot be looked up
          again — if it is lost, issue a new one from the account page.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" size="md" onClick={() => router.push('/admin/portal-users')}>
            Done
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              setIssued(null)
              setCopied(false)
            }}
          >
            Create another
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid max-w-3xl gap-6 pb-24">
      <Card className="p-6">
        <h2 className="font-sans text-base font-bold text-ink-900">Account details</h2>
        <p className="mt-1 text-[0.9375rem] text-ink-500">
          A temporary password is generated and shown once when you save.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField name="name" label="Full name" required placeholder="Ayesha Khan" />
          <TextField
            name="email"
            label="Email"
            type="email"
            required
            placeholder="ayesha@example.com"
          />

          <SelectField
            name="role"
            label="Role"
            required
            value={role}
            onChange={(event) => setRole(event.target.value as 'student' | 'instructor')}
            options={[
              { value: 'instructor', label: 'Instructor — teaches batches, marks work' },
              { value: 'student', label: 'Student — enrolled on batches' },
            ]}
          />

          <TextField name="phone" label="Phone" hint="Optional. e.g. 0300 1234567" />

          {role === 'instructor' && (
            <SelectField
              name="authorSlug"
              label="Public profile"
              className="sm:col-span-2"
              hint="Links this instructor to the author shown on course and blog pages. Optional."
              options={[{ value: '', label: 'Not linked' }, ...authorOptions]}
            />
          )}

          <TextField
            name="headline"
            label="Headline"
            className="sm:col-span-2"
            hint="Optional. A one-line description shown on their profile."
          />
        </div>

        <FieldError>{error}</FieldError>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.push('/admin/portal-users')}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 aria-hidden className="animate-spin" />
              Creating
            </>
          ) : (
            <>
              Create account
              <KeyRound aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
