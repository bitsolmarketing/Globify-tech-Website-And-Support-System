'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toaster'
import type { PortalActionResult } from '@/lib/portal/guard'
import { cn } from '@/lib/utils'

type Module = { module: string; topics: string[] }

/**
 * The syllabus, as something a student can tick off.
 *
 * Optimistic: the box fills the moment it is clicked and rolls back if the
 * write fails. Progress ticking is the most casual interaction in the portal —
 * a dozen clicks while skimming the curriculum — and a spinner on each one
 * would make it feel broken.
 */
export function ModuleChecklist({
  modules,
  completedIndexes,
  onToggle,
}: {
  modules: Module[]
  completedIndexes: number[]
  onToggle: (
    moduleIndex: number,
    moduleTitle: string,
    completed: boolean,
  ) => Promise<PortalActionResult>
}) {
  const router = useRouter()
  const [done, setDone] = React.useState(() => new Set(completedIndexes))
  const [pending, setPending] = React.useState<number | null>(null)

  /* The server is the source of truth: when a revalidation brings new props,
     adopt them rather than keeping local state that has drifted. */
  React.useEffect(() => setDone(new Set(completedIndexes)), [completedIndexes])

  async function toggle(index: number, title: string) {
    const next = new Set(done)
    const completed = !next.has(index)
    if (completed) next.add(index)
    else next.delete(index)

    setDone(next)
    setPending(index)

    const result = await onToggle(index, title, completed)
    setPending(null)

    if (!result.ok) {
      /* Put it back. A checkbox that stays ticked after a failed write is
         worse than one that never moved — it reports progress that no longer
         exists anywhere. */
      setDone(new Set(done))
      toast.error('Could not save that', { description: result.error })
      return
    }

    router.refresh()
  }

  if (modules.length === 0) {
    return (
      <Card className="px-6 py-10 text-center">
        <p className="font-sans text-[0.9375rem] text-ink-500">
          The curriculum for this course has not been published yet.
        </p>
      </Card>
    )
  }

  return (
    <ol className="grid gap-3">
      {modules.map((module, index) => {
        const checked = done.has(index)
        const busy = pending === index

        return (
          <li key={`${module.module}-${index}`}>
            <Card className={cn('p-4 transition-colors', checked && 'border-emerald-200 bg-emerald-50/40')}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`Mark "${module.module}" as complete`}
                  disabled={busy}
                  onClick={() => toggle(index, module.module)}
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors',
                    'focus-visible:ring-4 focus-visible:ring-brand-600/15 focus-visible:outline-none',
                    checked
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-ink-300 bg-white hover:border-brand-600',
                    busy && 'opacity-60',
                  )}
                >
                  {busy ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : (
                    checked && <Check aria-hidden className="size-3.5" />
                  )}
                </button>

                <div className="min-w-0">
                  <p
                    className={cn(
                      'font-sans text-[0.9375rem] font-bold text-ink-900',
                      checked && 'text-emerald-900',
                    )}
                  >
                    <span className="text-ink-400">{index + 1}.</span> {module.module}
                  </p>
                  {module.topics.length > 0 && (
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-600">
                      {module.topics.join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </li>
        )
      })}
    </ol>
  )
}
