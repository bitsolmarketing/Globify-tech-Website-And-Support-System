'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, Loader2, Pencil } from 'lucide-react'

import {
  AddRowButton,
  CheckboxField,
  FormSection,
  RepeatableRow,
  SaveButton,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/admin/form-fields'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { postFormSchema, type PostFormValues } from '@/lib/admin/schemas'
import type { ActionResult } from '@/lib/admin/guard'
import { cn, readingTime } from '@/lib/utils'

type Props = {
  defaultValues: PostFormValues
  authors: { value: string; label: string }[]
  /** Existing categories, offered as datalist suggestions. */
  categories: string[]
  tags: string[]
  onSubmitAction: (values: PostFormValues) => Promise<ActionResult>
  onPreview: (markdown: string) => Promise<string>
  submitLabel: string
  successMessage: string
}

export function PostForm({
  defaultValues,
  authors,
  categories,
  tags,
  onSubmitAction,
  onPreview,
  submitLabel,
  successMessage,
}: Props) {
  const router = useRouter()
  const listId = React.useId()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    mode: 'onBlur',
    defaultValues,
  })

  const faqs = useFieldArray({ control, name: 'faqs' })

  const body = useWatch({ control, name: 'body' }) ?? ''
  const [tab, setTab] = React.useState<'write' | 'preview'>('write')
  const [html, setHtml] = React.useState('')
  const [rendering, setRendering] = React.useState(false)

  /* Render on the server, debounced, and only while the preview tab is open —
     using the real pipeline means the preview matches the published article
     exactly rather than approximating it with a second markdown parser. */
  React.useEffect(() => {
    if (tab !== 'preview') return

    let cancelled = false
    setRendering(true)

    const timer = setTimeout(async () => {
      try {
        const rendered = await onPreview(body)
        if (!cancelled) setHtml(rendered)
      } catch {
        if (!cancelled) setHtml('<p>Preview unavailable.</p>')
      } finally {
        if (!cancelled) setRendering(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [body, tab, onPreview])

  const stats = readingTime(body)

  const onSubmit = handleSubmit(async (values) => {
    const result = await onSubmitAction(values)

    if (!result.ok) {
      toast.error('Could not save the post', { description: result.error })
      return
    }

    toast.success(successMessage, {
      description: 'The blog pages will regenerate on their next request.',
    })
    router.push('/admin/posts')
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 pb-24">
      {/* --------------------------------------------------- Front matter */}
      <FormSection title="Front matter" description="Everything that used to live above the --- in the MDX file.">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Slug"
            required
            placeholder="best-ai-courses-in-faisalabad"
            hint="The URL segment: /blog/<slug>"
            error={errors.slug?.message}
            {...register('slug')}
          />
          <SelectField
            label="Author"
            required
            options={authors}
            placeholder="Choose an author"
            error={errors.author?.message}
            {...register('author')}
          />
        </div>

        <TextField
          label="Title"
          required
          error={errors.title?.message}
          {...register('title')}
        />

        <TextareaField
          label="Meta description"
          required
          rows={3}
          hint="Shown in search results and on the blog cards."
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Published date"
            required
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />
          <TextField
            label="Updated date"
            type="date"
            hint="Leave blank if it has not been revised."
            error={errors.updated?.message}
            {...register('updated')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <TextField
              label="Category"
              required
              list={`${listId}-categories`}
              placeholder="Artificial Intelligence"
              error={errors.category?.message}
              {...register('category')}
            />
            <datalist id={`${listId}-categories`}>
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>

          <div className="grid gap-2">
            <Label>Existing tags</Label>
            <div className="flex flex-wrap gap-1.5">
              {tags.length === 0 ? (
                <span className="font-sans text-[0.8125rem] text-ink-400">None yet</span>
              ) : (
                tags.slice(0, 18).map((tag) => (
                  <Badge key={tag} variant="neutral" size="md">
                    {tag}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <TextareaField
          label="Tags"
          required
          rows={5}
          hint="One tag per line. Reuse the names above so archive pages stay tidy."
          error={errors.tags?.message}
          {...register('tags')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Cover image path"
            required
            placeholder="/images/generated/blog/example.webp"
            error={errors.image?.message}
            {...register('image')}
          />
          <TextField
            label="Image alt text"
            required
            error={errors.imageAlt?.message}
            {...register('imageAlt')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CheckboxField
            label="Feature this post"
            hint="Featured posts surface in the sidebar and on the homepage."
            {...register('featured')}
          />
          <CheckboxField
            label="Published"
            hint="Unpublished posts stay editable here but are hidden from the site, the sitemap and the RSS feed."
            {...register('published')}
          />
        </div>
      </FormSection>

      {/* --------------------------------------------------------- Editor */}
      <Card className="p-6 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-sans text-base font-bold text-ink-900">Article body</h2>
            <p className="mt-1 font-sans text-xs text-ink-500">
              Markdown with GFM tables and footnotes · {stats.words.toLocaleString('en-US')} words ·{' '}
              {stats.text}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Editor mode"
            className="flex rounded-xl bg-ink-100 p-1"
          >
            {(['write', 'preview'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={tab === mode}
                onClick={() => setTab(mode)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-sans text-[0.8125rem] font-semibold transition-colors',
                  tab === mode ? 'bg-white text-brand-900 shadow-soft' : 'text-ink-500 hover:text-ink-800',
                )}
              >
                {mode === 'write' ? (
                  <Pencil aria-hidden className="size-3.5" />
                ) : (
                  <Eye aria-hidden className="size-3.5" />
                )}
                {mode === 'write' ? 'Write' : 'Preview'}
              </button>
            ))}
          </div>
        </div>

        <div className={tab === 'write' ? 'block' : 'hidden'}>
          <TextareaField
            label="Markdown"
            className="[&>label]:sr-only"
            rows={28}
            spellCheck
            placeholder={'## Start with a heading\n\nThen write the article.'}
            error={errors.body?.message}
            {...register('body')}
          />
        </div>

        {tab === 'preview' && (
          <div className="rounded-2xl border border-hairline bg-white p-6 sm:p-8">
            {rendering ? (
              <p className="flex items-center gap-2 font-sans text-sm text-ink-500">
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Rendering preview
              </p>
            ) : (
              <div
                // Same `.article` styles and the same remark/rehype output as
                // the published page — no raw-HTML pass-through.
                className="article"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        )}
      </Card>

      {/* ----------------------------------------------------------- FAQs */}
      <FormSection
        title="Article FAQs"
        description="Optional. Rendered under the article and emitted as FAQPage schema."
      >
        {faqs.fields.map((field, index) => (
          <RepeatableRow
            key={field.id}
            index={index}
            label="FAQ"
            onRemove={() => faqs.remove(index)}
          >
            <TextField
              label="Question"
              required
              error={errors.faqs?.[index]?.question?.message}
              {...register(`faqs.${index}.question`)}
            />
            <TextareaField
              label="Answer"
              required
              rows={4}
              error={errors.faqs?.[index]?.answer?.message}
              {...register(`faqs.${index}.answer`)}
            />
          </RepeatableRow>
        ))}

        <AddRowButton onClick={() => faqs.append({ question: '', answer: '' })}>
          Add FAQ
        </AddRowButton>
      </FormSection>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-hairline bg-white/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Button type="button" variant="ghost" size="lg" onClick={() => router.push('/admin/posts')}>
          Cancel
        </Button>
        <SaveButton saving={isSubmitting}>{submitLabel}</SaveButton>
      </div>
    </form>
  )
}
