'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

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
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import {
  courseBadges,
  courseFormSchema,
  courseLevels,
  type CourseFormValues,
} from '@/lib/admin/schemas'
import { courseCategories } from '@/lib/courses'
import type { ActionResult } from '@/lib/admin/guard'

type Props = {
  defaultValues: CourseFormValues
  /** Instructor slugs, resolved on the server from the authors table. */
  instructors: { value: string; label: string }[]
  onSubmitAction: (values: CourseFormValues) => Promise<ActionResult>
  submitLabel: string
  successMessage: string
}

const CATEGORY_OPTIONS = courseCategories.map((category) => ({
  value: category,
  label: category,
}))

const LEVEL_OPTIONS = courseLevels.map((level) => ({ value: level, label: level }))

const BADGE_OPTIONS = [
  { value: '', label: 'No badge' },
  ...courseBadges.map((badge) => ({ value: badge, label: badge })),
]

/**
 * The full course editor, including the nested curriculum, careers and FAQ
 * groups. Same react-hook-form + zodResolver shape as
 * `src/components/forms/contact-form.tsx`, and the same zod schema the server
 * action re-validates with.
 */
export function CourseForm({
  defaultValues,
  instructors,
  onSubmitAction,
  submitLabel,
  successMessage,
}: Props) {
  const router = useRouter()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    mode: 'onBlur',
    defaultValues,
  })

  const curriculum = useFieldArray({ control, name: 'curriculum' })
  const careers = useFieldArray({ control, name: 'careers' })
  const faqs = useFieldArray({ control, name: 'faqs' })

  const onSubmit = handleSubmit(async (values) => {
    const result = await onSubmitAction(values)

    if (!result.ok) {
      toast.error('Could not save the course', { description: result.error })
      return
    }

    toast.success(successMessage, {
      description: 'The public pages will regenerate on their next request.',
    })
    router.push('/admin/courses')
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 pb-24">
      {/* ------------------------------------------------------- Identity */}
      <FormSection
        title="Identity"
        description="Slug, titles and the copy search engines see."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Slug"
            required
            placeholder="ai-and-automation"
            hint="The URL segment: /courses/<slug>"
            error={errors.slug?.message}
            {...register('slug')}
          />
          <SelectField
            label="Category"
            required
            options={CATEGORY_OPTIONS}
            error={errors.category?.message}
            {...register('category')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Title"
            required
            placeholder="AI & Automation Mastery"
            error={errors.title?.message}
            {...register('title')}
          />
          <TextField
            label="Short title"
            required
            placeholder="AI & Automation"
            hint="Used in navigation and breadcrumbs"
            error={errors.shortTitle?.message}
            {...register('shortTitle')}
          />
        </div>

        <TextField
          label="Tagline"
          required
          placeholder="Build with LLMs, agents and no-code automation"
          error={errors.tagline?.message}
          {...register('tagline')}
        />

        <TextareaField
          label="Meta description"
          required
          rows={3}
          hint="Around 155 characters — used verbatim as the page meta description."
          error={errors.description?.message}
          {...register('description')}
        />

        <TextareaField
          label="Overview paragraphs"
          required
          rows={6}
          hint="One paragraph per line."
          error={errors.overview?.message}
          {...register('overview')}
        />
      </FormSection>

      {/* -------------------------------------------------------- Logistics */}
      <FormSection title="Logistics" description="Duration, level, fee and delivery.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            label="Duration"
            required
            placeholder="3 Months"
            error={errors.duration?.message}
            {...register('duration')}
          />
          <TextField
            label="Weeks"
            required
            type="number"
            min={1}
            error={errors.durationWeeks?.message}
            {...register('durationWeeks')}
          />
          <TextField
            label="Hours / week"
            required
            type="number"
            min={1}
            error={errors.hoursPerWeek?.message}
            {...register('hoursPerWeek')}
          />
          <TextField
            label="Original fee (PKR)"
            required
            type="number"
            min={0}
            hint="The discount is applied from campaign settings."
            error={errors.originalFee?.message}
            {...register('originalFee')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Level"
            required
            options={LEVEL_OPTIONS}
            error={errors.level?.message}
            {...register('level')}
          />
          <TextField
            label="Language"
            required
            placeholder="Urdu + English"
            error={errors.language?.message}
            {...register('language')}
          />
        </div>

        <TextareaField
          label="Delivery modes"
          required
          rows={3}
          hint="One per line, e.g. On-Campus / Live Online / Hybrid."
          error={errors.mode?.message}
          {...register('mode')}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Image path"
            required
            placeholder="/images/generated/courses/ai-and-automation.webp"
            error={errors.image?.message}
            {...register('image')}
          />
          <TextField
            label="Icon"
            required
            placeholder="Sparkles"
            hint="A lucide-react icon name."
            error={errors.icon?.message}
            {...register('icon')}
          />
        </div>
      </FormSection>

      {/* ---------------------------------------------------------- Content */}
      <FormSection
        title="Skills, tools and outcomes"
        description="One item per line in each field."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextareaField
            label="Skills"
            required
            rows={8}
            error={errors.skills?.message}
            {...register('skills')}
          />
          <TextareaField
            label="Tools"
            required
            rows={8}
            error={errors.tools?.message}
            {...register('tools')}
          />
        </div>

        <TextareaField
          label="Learning outcomes"
          required
          rows={6}
          error={errors.outcomes?.message}
          {...register('outcomes')}
        />

        <TextareaField
          label="Portfolio projects"
          required
          rows={5}
          error={errors.projects?.message}
          {...register('projects')}
        />
      </FormSection>

      {/* ------------------------------------------------------- Curriculum */}
      <FormSection
        title="Curriculum"
        description="Modules in teaching order, each with its topic list."
      >
        {errors.curriculum?.root?.message && (
          <p role="alert" className="font-sans text-[0.8125rem] font-medium text-red-600">
            {errors.curriculum.root.message}
          </p>
        )}

        {curriculum.fields.map((field, index) => (
          <RepeatableRow
            key={field.id}
            index={index}
            label="Module"
            onRemove={() => curriculum.remove(index)}
            disableRemove={curriculum.fields.length <= 1}
          >
            <TextField
              label="Module title"
              required
              placeholder="Foundations of Modern AI"
              error={errors.curriculum?.[index]?.module?.message}
              {...register(`curriculum.${index}.module`)}
            />
            <TextareaField
              label="Topics"
              required
              rows={5}
              hint="One topic per line."
              error={errors.curriculum?.[index]?.topics?.message}
              {...register(`curriculum.${index}.topics`)}
            />
          </RepeatableRow>
        ))}

        <AddRowButton onClick={() => curriculum.append({ module: '', topics: '' })}>
          Add module
        </AddRowButton>
      </FormSection>

      {/* ---------------------------------------------------------- Careers */}
      <FormSection title="Career outcomes" description="Roles this course leads to.">
        {errors.careers?.root?.message && (
          <p role="alert" className="font-sans text-[0.8125rem] font-medium text-red-600">
            {errors.careers.root.message}
          </p>
        )}

        {careers.fields.map((field, index) => (
          <RepeatableRow
            key={field.id}
            index={index}
            label="Role"
            onRemove={() => careers.remove(index)}
            disableRemove={careers.fields.length <= 1}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Role"
                required
                placeholder="AI Automation Specialist"
                error={errors.careers?.[index]?.role?.message}
                {...register(`careers.${index}.role`)}
              />
              <TextField
                label="Salary range"
                required
                placeholder="Rs 120k – 300k / month"
                error={errors.careers?.[index]?.salary?.message}
                {...register(`careers.${index}.salary`)}
              />
            </div>
          </RepeatableRow>
        ))}

        <AddRowButton onClick={() => careers.append({ role: '', salary: '' })}>
          Add career outcome
        </AddRowButton>
      </FormSection>

      {/* ------------------------------------------------------------- FAQs */}
      <FormSection
        title="Course FAQs"
        description="Rendered on the course page and emitted as FAQPage schema."
      >
        {errors.faqs?.root?.message && (
          <p role="alert" className="font-sans text-[0.8125rem] font-medium text-red-600">
            {errors.faqs.root.message}
          </p>
        )}

        {faqs.fields.map((field, index) => (
          <RepeatableRow
            key={field.id}
            index={index}
            label="FAQ"
            onRemove={() => faqs.remove(index)}
            disableRemove={faqs.fields.length <= 1}
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

      {/* ------------------------------------------------------ Social proof */}
      <FormSection
        title="Instructor and social proof"
        description="Ratings feed the aggregate schema and the stats band."
      >
        <SelectField
          label="Instructor"
          required
          options={instructors}
          placeholder="Choose an instructor"
          error={errors.instructorSlug?.message}
          {...register('instructorSlug')}
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            label="Rating"
            required
            type="number"
            step="0.1"
            min={0}
            max={5}
            error={errors.rating?.message}
            {...register('rating')}
          />
          <TextField
            label="Reviews"
            required
            type="number"
            min={0}
            error={errors.reviews?.message}
            {...register('reviews')}
          />
          <TextField
            label="Enrolled"
            required
            type="number"
            min={0}
            error={errors.enrolled?.message}
            {...register('enrolled')}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Badge"
            options={BADGE_OPTIONS}
            error={errors.badge?.message}
            {...register('badge')}
          />
          <CheckboxField
            label="Feature this course on the homepage"
            className="self-end pb-3"
            {...register('featured')}
          />
        </div>
      </FormSection>

      {/* ------------------------------------------------------- Sticky bar */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-hairline bg-white/90 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Button type="button" variant="ghost" size="lg" onClick={() => router.push('/admin/courses')}>
          Cancel
        </Button>
        <SaveButton saving={isSubmitting}>{submitLabel}</SaveButton>
      </div>
    </form>
  )
}
