'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react'

import { SelectField, TextField, TextareaField } from '@/components/admin/form-fields'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FieldHint, Input, Label, Select } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { LEAD_STATUSES } from '@/db/schema'
import { broadcastFormSchema, toLines, type BroadcastFormValues } from '@/lib/admin/schemas'
import {
  MERGE_FIELDS,
  applyMergeFields,
  parsePhoneList,
  previewTemplate,
} from '@/lib/whatsapp/format'
import type { WhatsAppTemplate } from '@/lib/whatsapp/templates'

import { previewAudience, refreshTemplates, sendBroadcast, sendTest } from './actions'

/**
 * ---------------------------------------------------------------------------
 * Compose and send, on one screen
 * ---------------------------------------------------------------------------
 *
 * There used to be three screens: compose a draft, review its audience, press
 * send. The middle one is gone, because everything it showed can be shown here
 * while the message is still being written — and shown *live*, which the review
 * screen could not do: its recipient count was resolved when the draft was
 * saved and quietly went stale from that moment on.
 *
 * So the two questions worth asking are answered side by side and continuously:
 *
 *   1. **What does it say?** The preview renders the approved body with the
 *      variables filled in against a sample recipient. What it cannot show —
 *      the header, footer and buttons Meta holds — is what the test send is for,
 *      and the test sends from here rather than from a saved draft.
 *   2. **Who gets it?** The count under the audience choice comes from the same
 *      resolver the send queues from, re-asked whenever a filter changes. The
 *      number on the button is the number of people who will be messaged.
 *
 * Everything that is nearly always left alone — the course filter, a recency
 * window, scheduling, naming the send — is real but folded away, so the screen
 * opens on the four things a broadcast actually needs.
 */

/** One imaginary recipient, so the preview shows merge fields resolved. */
const SAMPLE = { name: 'Ahmed Raza', courseTitle: 'Amazon Virtual Assistant' }

/**
 * The audience, as four choices rather than three filters.
 *
 * `source` and `leadStatus` are separate fields in the schema, and separate
 * controls made "all leads" and "leads at one stage" look like unrelated
 * decisions when they are one. These collapse them into the question actually
 * being asked: who is this going to?
 */
const AUDIENCE_CHOICES = [
  {
    id: 'all',
    label: 'Everyone we have a number for',
    hint: 'Every lead in the pipeline, whatever stage they are at.',
  },
  {
    id: 'stage',
    label: 'Leads at one stage',
    hint: 'New enquiries only, or only the ones already contacted or enrolled.',
  },
  {
    id: 'threads',
    label: 'People who have messaged us',
    hint: 'Anyone with a WhatsApp thread, whether or not they became a lead.',
  },
  {
    id: 'paste',
    label: 'A list I paste in',
    hint: 'Numbers from a group export or a batch roster.',
  },
] as const

type AudienceChoice = (typeof AUDIENCE_CHOICES)[number]['id']

export function ComposeForm({
  templates,
  templatesError,
  courseOptions,
  canSend,
}: {
  templates: WhatsAppTemplate[]
  templatesError?: string
  courseOptions: { value: string; label: string }[]
  /** False when the WhatsApp credentials are missing — sending is not offered. */
  canSend: boolean
}) {
  const router = useRouter()

  /**
   * The approved list is fetched on the server and cached for five minutes, so
   * a template approved while this page was open would not appear. Held in
   * state rather than read straight from props so the refresh button can
   * replace it without a navigation that would discard everything typed.
   */
  const [templateList, setTemplateList] = React.useState(templates)
  const [templateError, setTemplateError] = React.useState(templatesError)
  const [refreshing, setRefreshing] = React.useState(false)

  const [testPhone, setTestPhone] = React.useState('')
  const [testing, setTesting] = React.useState(false)
  /* Two-step send, the same idiom as `DeleteButton`. Cheaper than a modal, and
     a stray click cannot message four hundred people. */
  const [armed, setArmed] = React.useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      templateName: '',
      templateLanguage: 'en_US',
      templateVariables: '',
      headerParameter: '',
      headerImageUrl: '',
      source: 'leads',
      leadStatus: '',
      courseSlug: '',
      sinceDays: '',
      manual: '',
      scheduledFor: '',
    },
  })

  const templateName = watch('templateName')
  const templateLanguage = watch('templateLanguage')
  const templateVariables = watch('templateVariables')
  const headerParameter = watch('headerParameter')
  const source = watch('source')
  const leadStatus = watch('leadStatus')
  const courseSlug = watch('courseSlug')
  const sinceDays = watch('sinceDays')
  const manual = watch('manual')
  const scheduledFor = watch('scheduledFor')

  /* A template is identified by name AND language — the same name exists once
     per translation — so the picker carries both and sets both. */
  const selected = templateList.find(
    (template) => template.name === templateName && template.language === templateLanguage,
  )

  const variableValues = React.useMemo(() => toLines(templateVariables), [templateVariables])

  const setVariable = React.useCallback(
    (index: number, value: string) => {
      const next = [...variableValues]
      while (next.length <= index) next.push('')
      next[index] = value
      /* Trailing blanks are dropped so an untouched box does not become an
         empty parameter — Meta rejects those with 132012. */
      while (next.length && !next[next.length - 1].trim()) next.pop()
      setValue('templateVariables', next.join('\n'), { shouldValidate: true })
    },
    [setValue, variableValues],
  )

  /* ------------------------------------------------------------- Audience */

  const choice: AudienceChoice =
    source === 'manual' ? 'paste' : source === 'conversations' ? 'threads' : leadStatus ? 'stage' : 'all'

  function chooseAudience(next: AudienceChoice) {
    setArmed(false)
    if (next === 'paste') {
      setValue('source', 'manual', { shouldValidate: false })
      return
    }
    if (next === 'threads') {
      setValue('source', 'conversations', { shouldValidate: false })
      setValue('leadStatus', '')
      return
    }

    setValue('source', 'leads', { shouldValidate: false })
    // "One stage" needs a stage; defaulting to the first is better than a
    // selected card that quietly still means "everyone".
    setValue('leadStatus', next === 'stage' ? LEAD_STATUSES[0] : '')
  }

  const manualParsed = React.useMemo(
    () => (source === 'manual' ? parsePhoneList(manual) : { valid: [], invalid: [] }),
    [manual, source],
  )

  /**
   * The live recipient count.
   *
   * Debounced because it resolves the real list on every change — the cost of
   * an honest number. `counting` is tracked so the send button can refuse to
   * arm against a number that is already known to be out of date.
   */
  const [audience, setAudience] = React.useState<{ total: number; optedOut: number } | null>(null)
  const [counting, setCounting] = React.useState(false)

  /* Serialised rather than passed as an object so the effect has one stable
     primitive to depend on. A fresh object every render would re-fire the count
     on every keystroke anywhere on the form, including in the message. */
  const audienceKey = JSON.stringify({
    source,
    leadStatus,
    courseSlug,
    sinceDays,
    manual: source === 'manual' ? manualParsed.valid : [],
  })

  React.useEffect(() => {
    const filter = JSON.parse(audienceKey) as {
      source: BroadcastFormValues['source']
      leadStatus: BroadcastFormValues['leadStatus']
      courseSlug: string
      sinceDays: BroadcastFormValues['sinceDays']
      manual: string[]
    }

    // Nothing pasted yet is not a question worth asking the server.
    if (filter.source === 'manual' && filter.manual.length === 0) {
      setAudience({ total: 0, optedOut: 0 })
      setCounting(false)
      return
    }

    setCounting(true)
    let cancelled = false

    const timer = setTimeout(async () => {
      const result = await previewAudience({
        source: filter.source,
        leadStatus: filter.leadStatus,
        courseSlug: filter.courseSlug,
        sinceDays: filter.sinceDays,
        manual: filter.manual.join('\n'),
      })

      /* A stale response must never overwrite a fresh one: the filter can move
         on while a slow count is in flight, and a number belonging to the
         previous filter is worse than no number at all. */
      if (cancelled) return

      setCounting(false)
      setAudience(result.ok ? result.data : null)
      if (!result.ok) toast.error('Could not count the audience', { description: result.error })
    }, 450)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [audienceKey])

  /* Any change to who or what is being sent disarms the button — the confirm
     must belong to the message on screen now, not the one it was armed for. */
  React.useEffect(() => setArmed(false), [audienceKey, templateName, templateVariables])

  /* -------------------------------------------------------------- Actions */

  async function onRefreshTemplates() {
    setRefreshing(true)
    const result = await refreshTemplates()
    setRefreshing(false)

    if (!result.ok) {
      toast.error('Could not reach WhatsApp Manager', { description: result.error })
      return
    }
    if (!result.data.ok) {
      setTemplateError(result.data.error)
      toast.error('Could not list templates', { description: result.data.error })
      return
    }

    setTemplateList(result.data.templates)
    setTemplateError(undefined)
    toast.success(`${result.data.templates.length} templates loaded`)
  }

  async function onTest() {
    if (!testPhone.trim()) return

    setTesting(true)
    const result = await sendTest(getValues(), testPhone)
    setTesting(false)

    if (!result.ok) {
      toast.error('Test message failed', { description: result.error })
      return
    }
    toast.success('Test sent', { description: `Check WhatsApp on ${testPhone}.` })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!armed) {
      setArmed(true)
      return
    }

    const result = await sendBroadcast(values)
    if (!result.ok) {
      setArmed(false)
      toast.error('Nothing was sent', { description: result.error })
      return
    }

    const { id, queued, optedOut, scheduled } = result.data
    toast.success(scheduled ? `Scheduled for ${queued} people` : `Sending to ${queued} people`, {
      description: optedOut > 0 ? `${optedOut} were skipped for having opted out.` : undefined,
    })

    router.push(`/admin/broadcasts/${id}`)
    router.refresh()
  })

  /* --------------------------------------------------------------- Render */

  const preview = previewTemplate(
    selected?.bodyText ?? '',
    variableValues.map((value) => applyMergeFields(value, SAMPLE)),
  )

  const recipients = audience?.total ?? 0
  const ready = Boolean(templateName) && recipients > 0 && !counting && canSend

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 pb-40 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-6">
        {/* ------------------------------------------------------- Message */}
        <Card className="grid gap-5 p-6">
          <Step number={1} title="The message">
            Templates are written and approved in WhatsApp Manager. Only an approved one can open a
            conversation with somebody who has not messaged first.
          </Step>

          {templateError ? (
            <>
              <Note>
                {templateError}{' '}
                <button
                  type="button"
                  onClick={onRefreshTemplates}
                  disabled={refreshing}
                  className="font-semibold underline underline-offset-2 disabled:opacity-60"
                >
                  {refreshing ? 'Checking…' : 'Try again'}
                </button>
              </Note>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  label="Template name"
                  required
                  placeholder="new_batch_alert"
                  hint="Exactly as it appears in WhatsApp Manager."
                  error={errors.templateName?.message}
                  {...register('templateName')}
                />
                <TextField
                  label="Template language"
                  required
                  placeholder="en_US"
                  hint="The locale code of the approved translation."
                  error={errors.templateLanguage?.message}
                  {...register('templateLanguage')}
                />
              </div>
              <TextareaField
                label="Template variables"
                rows={3}
                hint="One value per line, filling {{1}}, {{2}} … in order. Leave blank if it has none."
                error={errors.templateVariables?.message}
                {...register('templateVariables')}
              />
            </>
          ) : (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="template-picker" required>
                  Approved template
                </Label>
                {/* Approval can land while this page is open and the server list
                    is cached for five minutes. Without this the only way to see
                    a just-approved template is a reload, which throws away
                    everything already typed. */}
                <button
                  type="button"
                  onClick={onRefreshTemplates}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 font-sans text-[0.8125rem] font-semibold text-ink-500 transition-colors hover:text-brand-800 disabled:opacity-60"
                >
                  {refreshing ? (
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw aria-hidden className="size-3.5" />
                  )}
                  Refresh
                </button>
              </div>
              <Select
                id="template-picker"
                placeholder="Choose a template"
                options={templateList.map((template) => ({
                  value: `${template.name}::${template.language}`,
                  label:
                    `${template.name} · ${template.language}` +
                    (template.status !== 'APPROVED' ? ` · ${template.status}` : ''),
                }))}
                value={selected ? `${selected.name}::${selected.language}` : ''}
                onChange={(event) => {
                  const [name, language] = event.target.value.split('::')
                  setValue('templateName', name ?? '', { shouldValidate: true })
                  setValue('templateLanguage', language ?? 'en_US', { shouldValidate: true })
                  // A different template has different placeholders; keeping the
                  // old values would silently put them in new slots.
                  setValue('templateVariables', '')
                  setValue('headerParameter', '')
                }}
              />
              {errors.templateName?.message && (
                <p role="alert" className="font-sans text-[0.8125rem] font-medium text-red-600">
                  {errors.templateName.message}
                </p>
              )}
            </div>
          )}

          {selected && selected.status !== 'APPROVED' && (
            <Note>
              This template is {selected.status.toLowerCase()}, not approved. Meta will reject every
              message that uses it until that changes.
            </Note>
          )}

          {selected && selected.headerVariables > 0 && (
            <TextField
              label="Header variable"
              hint={`The header reads "${selected.headerText}".`}
              placeholder="{first_name}"
              error={errors.headerParameter?.message}
              {...register('headerParameter')}
            />
          )}

          {selected?.headerFormat === 'IMAGE' && (
            <TextField
              label="Header image URL"
              required
              placeholder="https://globifytech.com/images/announcement.jpg"
              hint="Meta fetches this itself, so it must be publicly reachable over https."
              error={errors.headerImageUrl?.message}
              {...register('headerImageUrl')}
            />
          )}

          {selected && selected.bodyVariables > 0 && (
            <div className="grid gap-3">
              <div>
                <Label>Fill in the blanks</Label>
                <FieldHint>
                  A fixed value, or a merge field:{' '}
                  {MERGE_FIELDS.map((field, index) => (
                    <React.Fragment key={field.token}>
                      {index > 0 && ', '}
                      <code className="font-mono text-ink-700">{field.token}</code>
                    </React.Fragment>
                  ))}
                </FieldHint>
              </div>
              {Array.from({ length: selected.bodyVariables }, (_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 rounded-lg bg-ink-100 py-2 text-center font-mono text-xs text-ink-600">
                    {`{{${index + 1}}}`}
                  </span>
                  <input
                    className="h-11 w-full rounded-xl border border-ink-200 bg-white px-4 font-sans text-[0.9375rem] text-ink-900 placeholder:text-ink-400 transition-[border-color,box-shadow] duration-200 hover:border-ink-300 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
                    value={variableValues[index] ?? ''}
                    placeholder={index === 0 ? '{first_name}' : 'A fixed value, or a merge field'}
                    onChange={(event) => setVariable(index, event.target.value)}
                  />
                </div>
              ))}
              {errors.templateVariables?.message && (
                <p role="alert" className="font-sans text-[0.8125rem] font-medium text-red-600">
                  {errors.templateVariables.message}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* ------------------------------------------------------ Audience */}
        <Card className="grid gap-5 p-6">
          <Step number={2} title="Who it goes to">
            Anyone who has replied STOP is left out automatically, and checked again at the moment
            each message is sent.
          </Step>

          <div className="grid gap-2.5" role="radiogroup" aria-label="Who it goes to">
            {AUDIENCE_CHOICES.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                  choice === option.id
                    ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600/20'
                    : 'border-ink-200 hover:border-ink-300'
                }`}
              >
                <input
                  type="radio"
                  name="audience-choice"
                  className="mt-1 size-4 accent-brand-700"
                  checked={choice === option.id}
                  onChange={() => chooseAudience(option.id)}
                />
                <span>
                  <span className="block font-sans text-[0.9375rem] font-semibold text-ink-900">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block font-sans text-[0.8125rem] text-ink-500">
                    {option.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {choice === 'stage' && (
            <SelectField
              label="Which stage"
              options={LEAD_STATUSES.map((status) => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1),
              }))}
              error={errors.leadStatus?.message}
              {...register('leadStatus')}
            />
          )}

          {choice === 'paste' && (
            <>
              <TextareaField
                label="Phone numbers"
                required
                rows={6}
                placeholder={'0300 1234567\n+92 321 7654321'}
                hint="One per line, or comma separated. Local numbers become +92 automatically."
                error={errors.manual?.message}
                {...register('manual')}
              />
              {manualParsed.invalid.length > 0 && (
                <p className="font-sans text-[0.8125rem] text-red-600">
                  {manualParsed.invalid.length} unreadable and ignored:{' '}
                  {manualParsed.invalid.slice(0, 3).join(', ')}
                  {manualParsed.invalid.length > 3 ? '…' : ''}
                </p>
              )}
            </>
          )}
        </Card>

        {/* ------------------------------------------------------ Advanced */}
        <details className="group rounded-2xl border border-ink-200 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-sans text-[0.9375rem] font-semibold text-ink-700">
            Narrow it down, schedule it, name it
            <ChevronDown
              aria-hidden
              className="size-4 text-ink-400 transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="grid gap-5 border-t border-hairline p-5">
            {choice !== 'paste' && (
              <div className="grid gap-5 sm:grid-cols-2">
                {choice !== 'threads' && (
                  <SelectField
                    label="Course they enquired about"
                    options={[{ value: '', label: 'Any course' }, ...courseOptions]}
                    error={errors.courseSlug?.message}
                    {...register('courseSlug')}
                  />
                )}
                <TextField
                  label="Only from the last N days"
                  type="number"
                  min={1}
                  placeholder="Leave blank for all time"
                  hint={
                    choice === 'threads'
                      ? 'Counted from the last activity on the thread.'
                      : 'Counted from when the lead was captured.'
                  }
                  error={errors.sinceDays?.message}
                  {...register('sinceDays')}
                />
              </div>
            )}

            <TextField
              label="Send later instead"
              type="datetime-local"
              hint="Your browser's timezone. The scheduler checks every few minutes, so it may start slightly after."
              error={errors.scheduledFor?.message}
              {...register('scheduledFor')}
            />

            <TextField
              label="Name this send"
              placeholder="Named after the template and today's date"
              hint="Only the team sees it, in the list of past broadcasts."
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
        </details>
      </div>

      {/* --------------------------------------------------- Preview column */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl bg-[#ECE5DD] p-5">
          <p className="mb-3 font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-500 uppercase">
            As {SAMPLE.name} sees it
          </p>
          <div className="rounded-2xl rounded-tl-sm bg-white p-4 shadow-soft">
            {selected?.headerFormat === 'IMAGE' && (
              <div className="mb-3 grid h-24 place-items-center rounded-xl bg-ink-100 font-sans text-xs text-ink-500">
                Header image
              </div>
            )}
            {selected?.headerFormat === 'TEXT' && selected.headerText && (
              <p className="mb-1.5 font-sans text-sm font-bold text-ink-900">
                {previewTemplate(selected.headerText, [applyMergeFields(headerParameter, SAMPLE)])}
              </p>
            )}
            <p className="font-sans text-[0.9375rem] whitespace-pre-wrap text-ink-800">
              {preview || 'Choose a template to see the message.'}
            </p>
            {selected?.footerText && (
              <p className="mt-2 font-sans text-xs text-ink-400">{selected.footerText}</p>
            )}
            {selected?.buttonLabels.map((label) => (
              <p
                key={label}
                className="mt-2 border-t border-hairline pt-2 text-center font-sans text-sm font-semibold text-[#0a7cff]"
              >
                {label}
              </p>
            ))}
          </div>
          <p className="mt-3 font-sans text-xs text-ink-600">
            The header, footer and buttons are held by Meta. Send yourself a test to see exactly
            what arrives.
          </p>
        </div>

        {canSend && (
          <div className="mt-4 grid gap-2">
            <Label htmlFor="test-phone">Test it on one number</Label>
            <div className="flex gap-2">
              <Input
                id="test-phone"
                type="tel"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
                placeholder="0300 1234567"
                className="h-11"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={testing || !testPhone.trim() || !templateName}
                onClick={onTest}
              >
                {testing ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
                Test
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* ------------------------------------------------------- Send bar
          Pinned rather than placed at the end of the form: the count and the
          button are the two things worth seeing whichever field is being
          edited, and on a long compose they would otherwise be scrolled away
          exactly while the audience is being changed. `lg:left-64` matches the
          shell's sidebar so the bar starts where the content does. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 backdrop-blur-xl lg:left-64">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <p className="inline-flex items-center gap-2 font-sans text-[0.9375rem] text-ink-700">
            <Users aria-hidden className="size-4 text-ink-400" />
            {counting ? (
              <span className="text-ink-500">Counting…</span>
            ) : audience === null ? (
              <span className="text-ink-500">Recipients unknown</span>
            ) : (
              <>
                <strong className="font-bold text-ink-900">{recipients}</strong>
                {recipients === 1 ? 'person' : 'people'}
                {audience.optedOut > 0 && (
                  <span className="text-ink-500">· {audience.optedOut} opted out, skipped</span>
                )}
              </>
            )}
          </p>

          <div className="flex items-center gap-3">
            {armed && (
              <p className="font-sans text-[0.8125rem] font-semibold text-gold-800">
                {scheduledFor ? 'Queue it for later?' : 'This goes out immediately.'}
              </p>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || !ready}
              /* Armed is a different colour as well as different words: the
                 second press is the irreversible one and should not look like
                 the first. */
              className={armed ? 'bg-red-600 hover:bg-red-700' : undefined}
            >
              {isSubmitting ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <Send aria-hidden />
              )}
              {isSubmitting
                ? 'Sending…'
                : armed
                  ? `Yes — ${scheduledFor ? 'schedule' : 'send'} to ${recipients}`
                  : scheduledFor
                    ? `Schedule for ${recipients}`
                    : `Send to ${recipients} ${recipients === 1 ? 'person' : 'people'}`}
            </Button>
          </div>
        </div>

        {!canSend && (
          <p className="border-t border-gold-300/70 bg-gold-50 px-6 py-2.5 text-center font-sans text-[0.8125rem] text-gold-900">
            Sending is disabled until <code className="font-mono">WHATSAPP_PHONE_ID</code> and{' '}
            <code className="font-mono">WHATSAPP_TOKEN</code> are set in the environment.
          </p>
        )}
      </div>
    </form>
  )
}

/* -------------------------------------------------------------------------- */

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-700 font-sans text-[0.8125rem] font-bold text-white">
        {number}
      </span>
      <div>
        <h2 className="font-sans text-base font-bold text-ink-900">{title}</h2>
        <p className="mt-0.5 font-sans text-[0.8125rem] text-ink-500">{children}</p>
      </div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-gold-300/70 bg-gold-50 p-4 text-gold-900">
      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="font-sans text-[0.875rem] leading-relaxed">{children}</p>
    </div>
  )
}
