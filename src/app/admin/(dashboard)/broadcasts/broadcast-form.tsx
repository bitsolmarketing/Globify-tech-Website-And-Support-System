'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react'

import {
  FormSection,
  SaveButton,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/admin/form-fields'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FieldHint, Label } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { LEAD_STATUSES } from '@/db/schema'
import type { DataResult } from '@/lib/admin/guard'
import {
  broadcastFormSchema,
  toLines,
  type BroadcastFormValues,
} from '@/lib/admin/schemas'
import {
  MERGE_FIELDS,
  applyMergeFields,
  parsePhoneList,
  previewTemplate,
} from '@/lib/whatsapp/format'
import type { WhatsAppTemplate } from '@/lib/whatsapp/templates'

import { refreshTemplates, type SavedBroadcast } from './actions'

/**
 * The compose screen.
 *
 * Its job is to make the two things that go wrong impossible to miss *before*
 * the send rather than after it:
 *
 *   1. **The wrong message.** A template's header, footer and buttons live at
 *      Meta and never appear in a draft, so the preview shows the body with the
 *      variables filled in against a sample recipient — and the detail screen
 *      offers a test send for everything the preview cannot show.
 *   2. **The wrong people.** The audience is counted from the same parser the
 *      server queues from, so the number here is the number that gets messaged.
 */
export function BroadcastForm({
  broadcastId,
  defaultValues,
  templates,
  templatesError,
  courseOptions,
  onSubmitAction,
  submitLabel = 'Save and build audience',
}: {
  broadcastId: string | null
  defaultValues: BroadcastFormValues
  templates: WhatsAppTemplate[]
  templatesError?: string
  courseOptions: { value: string; label: string }[]
  onSubmitAction: (
    id: string | null,
    values: BroadcastFormValues,
  ) => Promise<DataResult<SavedBroadcast>>
  submitLabel?: string
}) {
  const router = useRouter()

  /**
   * The approved list is fetched on the server and cached for five minutes, so
   * a template approved while this page was open would not appear. Held in
   * state rather than read straight from props so the refresh button can
   * replace it without a navigation that would discard everything typed so far.
   */
  const [templateList, setTemplateList] = React.useState(templates)
  const [templateError, setTemplateError] = React.useState(templatesError)
  const [refreshing, setRefreshing] = React.useState(false)

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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastFormSchema),
    mode: 'onBlur',
    defaultValues,
  })

  const kind = watch('kind')
  const source = watch('source')
  const templateName = watch('templateName')
  const templateLanguage = watch('templateLanguage')
  const templateVariables = watch('templateVariables')
  const headerParameter = watch('headerParameter')
  const body = watch('body')
  const manual = watch('manual')

  /* A template is identified by name AND language — the same name exists once
     per translation — so the dropdown carries both and sets both. */
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

  const manualParsed = React.useMemo(
    () => (source === 'manual' ? parsePhoneList(manual) : { valid: [], invalid: [] }),
    [manual, source],
  )

  /* One imaginary recipient, so the preview shows what a merge field becomes
     rather than the token itself. */
  const sample = { name: 'Ahmed Raza', courseTitle: 'Amazon Virtual Assistant' }

  const preview =
    kind === 'template'
      ? previewTemplate(
          selected?.bodyText ?? '',
          variableValues.map((value) => applyMergeFields(value, sample)),
        )
      : applyMergeFields(body, sample)

  const onSubmit = handleSubmit(async (values) => {
    const result = await onSubmitAction(broadcastId, values)

    if (!result.ok) {
      toast.error('Could not save the broadcast', { description: result.error })
      return
    }

    const { id, audience } = result.data
    toast.success('Broadcast saved', {
      description:
        audience.optedOut > 0
          ? `${audience.added} recipients queued · ${audience.optedOut} skipped for having opted out.`
          : `${audience.added} recipients queued. Review them before sending.`,
    })

    router.push(`/admin/broadcasts/${id}`)
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-6 pb-24">
      <FormSection
        title="The broadcast"
        description="A name only the team sees, so this send can be found again in the list."
      >
        <TextField
          label="Name"
          required
          placeholder="November batch — final call"
          error={errors.name?.message}
          {...register('name')}
        />
      </FormSection>

      {/* ------------------------------------------------------------ Message */}
      <FormSection
        title="Message"
        description="A template reaches anyone. Free text only reaches people who have messaged in the last 24 hours."
      >
        <SelectField
          label="Message type"
          required
          options={[
            { value: 'template', label: 'Approved template — reaches everyone' },
            { value: 'text', label: 'Free text — only within the 24-hour window' },
          ]}
          error={errors.kind?.message}
          {...register('kind')}
        />

        {kind === 'text' && (
          <Note tone="warning" icon={AlertTriangle}>
            WhatsApp only delivers free text to someone who has messaged you in the last 24 hours.
            Everyone else on the list will be skipped with a reason, not messaged. For an
            announcement to a cold list, use a template.
          </Note>
        )}

        {kind === 'template' ? (
          <>
            {templateError ? (
              <>
                <Note tone="warning" icon={AlertTriangle}>
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
              </>
            ) : (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="template-picker" required>
                    Approved template
                  </Label>
                  {/* Approval can land while this page is open, and the server
                      list is cached for five minutes. Without this the only way
                      to see a just-approved template is a reload, which throws
                      away everything already typed. */}
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
                <select
                  id="template-picker"
                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-ink-200 bg-white px-4 font-sans text-[0.9375rem] text-ink-900 transition-[border-color,box-shadow] duration-200 hover:border-ink-300 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12 focus:outline-none"
                  value={selected ? `${selected.name}::${selected.language}` : ''}
                  onChange={(event) => {
                    const [name, language] = event.target.value.split('::')
                    setValue('templateName', name ?? '', { shouldValidate: true })
                    setValue('templateLanguage', language ?? 'en_US', { shouldValidate: true })
                    // A different template has different placeholders; keeping
                    // the old values would silently put them in new slots.
                    setValue('templateVariables', '')
                    setValue('headerParameter', '')
                  }}
                >
                  <option value="" disabled>
                    Choose a template
                  </option>
                  {templateList.map((template) => (
                    <option
                      key={`${template.name}::${template.language}`}
                      value={`${template.name}::${template.language}`}
                    >
                      {template.name} · {template.language}
                      {template.status !== 'APPROVED' ? ` · ${template.status}` : ''}
                    </option>
                  ))}
                </select>
                {errors.templateName?.message && (
                  <p role="alert" className="font-sans text-[0.8125rem] font-medium text-red-600">
                    {errors.templateName.message}
                  </p>
                )}
                <FieldHint>
                  Templates are created and approved in WhatsApp Manager. Only an approved one can
                  open a conversation with someone who has not messaged first.
                </FieldHint>
              </div>
            )}

            {selected && selected.status !== 'APPROVED' && (
              <Note tone="warning" icon={AlertTriangle}>
                This template is {selected.status.toLowerCase()}, not approved. Meta will reject
                every message that uses it until that changes.
              </Note>
            )}

            {selected && selected.headerVariables > 0 && (
              <TextField
                label="Header variable"
                hint={`The header reads "${selected.headerText}". Merge fields work here too.`}
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
                <Label>
                  Template variables
                  <span aria-hidden className="ml-0.5 text-red-600">
                    *
                  </span>
                </Label>
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

            {/* No metadata to drive per-variable boxes, so the raw list stands
                in — one value per line, in placeholder order. */}
            {!selected && templateError && (
              <TextareaField
                label="Template variables"
                rows={3}
                hint="One value per line, filling {{1}}, {{2}} … in order. Leave blank if the template has none."
                error={errors.templateVariables?.message}
                {...register('templateVariables')}
              />
            )}
          </>
        ) : (
          <TextareaField
            label="Message"
            required
            rows={6}
            hint="Merge fields work here. Up to 4096 characters."
            error={errors.body?.message}
            {...register('body')}
          />
        )}

        <div className="rounded-xl bg-ink-50/70 p-4">
          <p className="font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-400 uppercase">
            Merge fields
          </p>
          <ul className="mt-2 grid gap-1">
            {MERGE_FIELDS.map((field) => (
              <li key={field.token} className="font-sans text-[0.8125rem] text-ink-600">
                <code className="font-mono text-ink-900">{field.token}</code> — {field.label}
              </li>
            ))}
          </ul>
        </div>
      </FormSection>

      {/* ------------------------------------------------------------ Preview */}
      {(preview || selected) && (
        <Card className="bg-[#ECE5DD] p-5">
          <p className="mb-3 font-sans text-[0.6875rem] font-bold tracking-[0.1em] text-ink-500 uppercase">
            Preview — as {sample.name} would see it
          </p>
          <div className="max-w-md rounded-2xl rounded-tl-sm bg-white p-4 shadow-soft">
            {selected?.headerFormat === 'IMAGE' && (
              <div className="mb-3 grid h-28 place-items-center rounded-xl bg-ink-100 font-sans text-xs text-ink-500">
                Header image
              </div>
            )}
            {selected?.headerFormat === 'TEXT' && selected.headerText && (
              <p className="mb-1.5 font-sans text-sm font-bold text-ink-900">
                {previewTemplate(selected.headerText, [
                  applyMergeFields(headerParameter, sample),
                ])}
              </p>
            )}
            <p className="font-sans text-[0.9375rem] whitespace-pre-wrap text-ink-800">
              {preview || 'Your message will appear here.'}
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
          <p className="mt-3 font-sans text-xs text-ink-500">
            The header, footer and buttons are held by Meta and shown here from the approved
            template. Send yourself a test from the next screen to see exactly what arrives.
          </p>
        </Card>
      )}

      {/* ----------------------------------------------------------- Audience */}
      <FormSection
        title="Audience"
        description="Saving rebuilds the recipient list from these filters. Nobody is messaged until you review it and press send."
      >
        <SelectField
          label="Recipients from"
          required
          options={[
            { value: 'leads', label: 'Leads — everyone with a phone number' },
            { value: 'conversations', label: 'WhatsApp threads — people who have messaged us' },
            { value: 'manual', label: 'A list I paste in' },
          ]}
          error={errors.source?.message}
          {...register('source')}
        />

        {source === 'leads' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Lead status"
              options={[
                { value: '', label: 'Any status' },
                ...LEAD_STATUSES.map((status) => ({
                  value: status,
                  label: status.charAt(0).toUpperCase() + status.slice(1),
                })),
              ]}
              error={errors.leadStatus?.message}
              {...register('leadStatus')}
            />
            <SelectField
              label="Course enquired about"
              options={[{ value: '', label: 'Any course' }, ...courseOptions]}
              error={errors.courseSlug?.message}
              {...register('courseSlug')}
            />
          </div>
        )}

        {source !== 'manual' && (
          <TextField
            label="Only from the last N days"
            type="number"
            min={1}
            placeholder="Leave blank for all time"
            hint={
              source === 'leads'
                ? 'Counted from when the lead was captured.'
                : 'Counted from the last activity on the thread.'
            }
            error={errors.sinceDays?.message}
            {...register('sinceDays')}
          />
        )}

        {source === 'manual' && (
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
            {(manualParsed.valid.length > 0 || manualParsed.invalid.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success" size="md">
                  {manualParsed.valid.length} valid
                </Badge>
                {manualParsed.invalid.length > 0 && (
                  <Badge size="md" className="bg-red-50 text-red-700 ring-1 ring-red-200 ring-inset">
                    {manualParsed.invalid.length} unreadable:{' '}
                    {manualParsed.invalid.slice(0, 3).join(', ')}
                    {manualParsed.invalid.length > 3 ? '…' : ''}
                  </Badge>
                )}
              </div>
            )}
          </>
        )}

        <Note tone="info" icon={Info}>
          Anyone who has replied STOP is removed from the list automatically, and checked again at
          the moment of sending.
        </Note>
      </FormSection>

      {/* ----------------------------------------------------------- Schedule */}
      <FormSection
        title="Schedule"
        description="Leave blank to send by hand from the next screen."
      >
        <TextField
          label="Send automatically at"
          type="datetime-local"
          hint="Your browser's timezone. The scheduler checks every few minutes, so it may start slightly after."
          error={errors.scheduledFor?.message}
          {...register('scheduledFor')}
        />
      </FormSection>

      <div className="flex justify-end">
        <SaveButton saving={isSubmitting}>{submitLabel}</SaveButton>
      </div>
    </form>
  )
}

/* -------------------------------------------------------------------------- */

function Note({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'info' | 'warning'
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  children: React.ReactNode
}) {
  const styles =
    tone === 'warning'
      ? 'border-gold-300/70 bg-gold-50 text-gold-900'
      : 'border-brand-200/70 bg-brand-50 text-brand-900'

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-4 ${styles}`}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="font-sans text-[0.875rem] leading-relaxed">{children}</p>
    </div>
  )
}
