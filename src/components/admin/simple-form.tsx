'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  useController,
  useForm,
  type Control,
  type DefaultValues,
  type FieldValues,
  type Path,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ZodType } from 'zod'

import {
  CheckboxField,
  FormSection,
  SaveButton,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/admin/form-fields'
import { ImageUploadField } from '@/components/admin/image-upload-field'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import type { ActionResult } from '@/lib/admin/guard'
import type { UploadResult } from '@/lib/admin/image-upload'

/**
 * A declarative form for the flat CRUD resources (testimonials, FAQs, gallery
 * items, authors). Each screen supplies a field list; the wiring — resolver,
 * error display, toast, redirect — is identical to `CourseForm`, just not
 * hand-written four more times.
 */
export type SimpleField<T extends FieldValues> = {
  name: Path<T>
  label: string
  type?: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'email' | 'url' | 'date' | 'image'
  required?: boolean
  hint?: string
  placeholder?: string
  rows?: number
  options?: { value: string; label: string }[]
  /** Column span inside the two-column grid. */
  full?: boolean
  min?: number
  max?: number
  step?: string
  /** Required when `type: 'image'` — a server action, so it's safe to pass from a server page. */
  uploadAction?: (formData: FormData) => Promise<UploadResult>
}

/**
 * `ImageUploadField` needs a controlled value, but `SimpleForm` otherwise
 * uses uncontrolled `register()` fields — this is the one case that needs
 * `useController`, pulled into its own component so the hook isn't called
 * inside the `fields.map()` loop below.
 */
function ControlledImageField<T extends FieldValues>({
  control,
  field,
  error,
  className,
}: {
  control: Control<T>
  field: SimpleField<T>
  error?: string
  className?: string
}) {
  const { field: controller } = useController({ control, name: field.name })

  return (
    <ImageUploadField
      label={field.label}
      required={field.required}
      hint={field.hint}
      value={(controller.value as string) ?? ''}
      onChange={controller.onChange}
      onBlur={controller.onBlur}
      uploadAction={field.uploadAction!}
      error={error}
      className={className}
    />
  )
}

export function SimpleForm<T extends FieldValues>({
  schema,
  defaultValues,
  fields,
  sectionTitle,
  sectionDescription,
  onSubmitAction,
  cancelHref,
  submitLabel,
  successMessage,
}: {
  schema: ZodType<T>
  defaultValues: DefaultValues<T>
  fields: SimpleField<T>[]
  sectionTitle: string
  sectionDescription?: string
  onSubmitAction: (values: T) => Promise<ActionResult>
  cancelHref: string
  submitLabel: string
  successMessage: string
}) {
  const router = useRouter()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues,
  })

  const onSubmit = handleSubmit(async (values) => {
    const result = await onSubmitAction(values as T)

    if (!result.ok) {
      toast.error('Could not save', { description: result.error })
      return
    }

    toast.success(successMessage, {
      description: 'The public pages will regenerate on their next request.',
    })
    router.push(cancelHref)
    router.refresh()
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-6 pb-24">
      <FormSection title={sectionTitle} description={sectionDescription}>
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => {
            const error = (errors as Record<string, { message?: string } | undefined>)[field.name]
              ?.message
            const span = field.full || field.type === 'textarea' ? 'sm:col-span-2' : undefined

            if (field.type === 'image') {
              return (
                <ControlledImageField
                  key={String(field.name)}
                  control={control}
                  field={field}
                  error={error}
                  className={span}
                />
              )
            }

            if (field.type === 'textarea') {
              return (
                <TextareaField
                  key={String(field.name)}
                  label={field.label}
                  required={field.required}
                  hint={field.hint}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 4}
                  className={span}
                  error={error}
                  {...register(field.name)}
                />
              )
            }

            if (field.type === 'select') {
              return (
                <SelectField
                  key={String(field.name)}
                  label={field.label}
                  required={field.required}
                  hint={field.hint}
                  options={field.options ?? []}
                  className={span}
                  error={error}
                  {...register(field.name)}
                />
              )
            }

            if (field.type === 'checkbox') {
              return (
                <CheckboxField
                  key={String(field.name)}
                  label={field.label}
                  hint={field.hint}
                  className={span}
                  error={error}
                  {...register(field.name)}
                />
              )
            }

            return (
              <TextField
                key={String(field.name)}
                label={field.label}
                required={field.required}
                hint={field.hint}
                placeholder={field.placeholder}
                type={field.type ?? 'text'}
                min={field.min}
                max={field.max}
                step={field.step}
                className={span}
                error={error}
                {...register(field.name)}
              />
            )
          })}
        </div>
      </FormSection>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" size="lg" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
        <SaveButton saving={isSubmitting}>{submitLabel}</SaveButton>
      </div>
    </form>
  )
}
