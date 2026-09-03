'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldError, FieldHint, Input, Label, Textarea } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import type { PortalActionResult } from '@/lib/portal/guard'

export type SubmissionState = { error?: string; field?: string; ok?: boolean }

/**
 * Handing in a piece of work.
 *
 * Resubmitting clears the previous mark, so the button says so plainly rather
 * than discovering it afterwards — a student who has been marked 78 and
 * uploads a fixed link should know the 78 is going away.
 */
export function SubmissionForm({
  onSubmit,
  defaultUrl,
  defaultNotes,
  hasMark,
  closed,
  closedReason,
}: {
  onSubmit: (input: { url: string; notes: string }) => Promise<PortalActionResult>
  defaultUrl?: string | null
  defaultNotes?: string | null
  hasMark: boolean
  closed: boolean
  closedReason?: string
}) {
  const router = useRouter()
  const formId = React.useId()
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>()

  if (closed) {
    return (
      <Card className="p-5">
        <p className="font-sans text-[0.9375rem] text-ink-600">
          {closedReason ?? 'This assignment is closed for submissions.'}
        </p>
      </Card>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    setPending(true)
    setError(undefined)

    const result = await onSubmit({
      url: String(data.get('url') ?? ''),
      notes: String(data.get('notes') ?? ''),
    })

    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    toast.success('Handed in', { description: 'Your instructor can see it now.' })
    router.refresh()
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-sans text-base font-bold text-ink-900">
        {defaultUrl || defaultNotes ? 'Update your submission' : 'Hand in your work'}
      </h2>

      {hasMark && (
        <p className="mt-1.5 font-sans text-[0.8125rem] text-amber-700">
          This assignment has already been marked. Submitting again clears the mark and puts it
          back in your instructor&apos;s queue.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-5 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-url`}>Link to your work</Label>
          <Input
            id={`${formId}-url`}
            name="url"
            type="url"
            defaultValue={defaultUrl ?? ''}
            placeholder="https://github.com/you/project"
            aria-invalid={error ? true : undefined}
          />
          <FieldHint>A repository, a deployed URL, a shared drive link — whatever fits.</FieldHint>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${formId}-notes`}>Notes for your instructor</Label>
          <Textarea
            id={`${formId}-notes`}
            name="notes"
            rows={5}
            defaultValue={defaultNotes ?? ''}
            placeholder="Anything you want them to know — what you found hard, what you would do with more time."
          />
          <FieldError>{error}</FieldError>
        </div>

        <div>
          <Button type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? (
              <>
                <Loader2 aria-hidden className="animate-spin" />
                Submitting
              </>
            ) : (
              <>
                {defaultUrl || defaultNotes ? 'Update submission' : 'Hand in'}
                <Send aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
