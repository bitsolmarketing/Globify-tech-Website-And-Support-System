'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Checkbox,
  FieldError,
  FieldHint,
  Honeypot,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import {
  contactFormSchema,
  type ContactFormValues,
  type CourseOption,
} from '@/lib/validations'
import { cn } from '@/lib/utils'

type Props = {
  /** Live catalogue, resolved on the server and passed in. */
  courseOptions: CourseOption[]
  /** Pre-selects a course when the form is embedded on a course page. */
  defaultCourse?: string
  className?: string
}

export function ContactForm({ courseOptions, defaultCourse, className }: Props) {
  const [submitted, setSubmitted] = React.useState(false)
  const formId = React.useId()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      course: defaultCourse ?? '',
      message: '',
      website: '',
      consent: false as unknown as true,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!response.ok) throw new Error('Request failed')

      reset()
      setSubmitted(true)
      toast.success('Message sent successfully', {
        description: 'Our admissions team will call you within one working day.',
      })
    } catch {
      toast.error('Could not send your message', {
        description: 'Please try again, or reach us directly on WhatsApp.',
      })
    }
  })

  if (submitted) {
    return (
      <div
        role="status"
        className={cn(
          'flex flex-col items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-10 text-center',
          className,
        )}
      >
        <span className="grid size-14 place-items-center rounded-full bg-brand-900 text-white">
          <CheckCircle2 aria-hidden className="size-7" />
        </span>
        <h3 className="font-sans text-xl font-bold text-brand-900">Thank you — message received</h3>
        <p className="max-w-sm text-ink-600">
          Our admissions team will contact you within one working day to confirm your batch, timing
          and the 50% discount.
        </p>
        <Button variant="secondary" size="md" onClick={() => setSubmitted(false)}>
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn('grid gap-5', className)}>
      <div className="grid gap-5 sm:grid-cols-2">
        {/* -------------------------------------------------------- Name */}
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-name`} required>
            Full Name
          </Label>
          <Input
            id={`${formId}-name`}
            autoComplete="name"
            placeholder="e.g. Ahmed Raza"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            {...register('name')}
          />
          <FieldError id={`${formId}-name-error`}>{errors.name?.message}</FieldError>
        </div>

        {/* ------------------------------------------------------- Phone */}
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-phone`} required>
            Phone / WhatsApp
          </Label>
          <Input
            id={`${formId}-phone`}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0300 1234567"
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={errors.phone ? `${formId}-phone-error` : undefined}
            {...register('phone')}
          />
          <FieldError id={`${formId}-phone-error`}>{errors.phone?.message}</FieldError>
        </div>
      </div>

      {/* --------------------------------------------------------- Email */}
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-email`} required>
          Email Address
        </Label>
        <Input
          id={`${formId}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${formId}-email-error` : undefined}
          {...register('email')}
        />
        <FieldError id={`${formId}-email-error`}>{errors.email?.message}</FieldError>
      </div>

      {/* -------------------------------------------------------- Course */}
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-course`} required>
          Course of Interest
        </Label>
        <Select
          id={`${formId}-course`}
          options={courseOptions}
          placeholder="Select a course"
          defaultValue={defaultCourse ?? ''}
          aria-invalid={errors.course ? true : undefined}
          aria-describedby={errors.course ? `${formId}-course-error` : undefined}
          {...register('course')}
        />
        <FieldError id={`${formId}-course-error`}>{errors.course?.message}</FieldError>
      </div>

      {/* ------------------------------------------------------- Message */}
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-message`} required>
          Message
        </Label>
        <Textarea
          id={`${formId}-message`}
          rows={5}
          placeholder="Tell us about your background and what you want to achieve. We will recommend the right course honestly."
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={
            errors.message ? `${formId}-message-error` : `${formId}-message-hint`
          }
          {...register('message')}
        />
        {errors.message ? (
          <FieldError id={`${formId}-message-error`}>{errors.message.message}</FieldError>
        ) : (
          <FieldHint id={`${formId}-message-hint`}>
            Include your education, work status and preferred batch timing if you can.
          </FieldHint>
        )}
      </div>

      {/* ------------------------------------------------------- Consent */}
      <div className="grid gap-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id={`${formId}-consent`}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? `${formId}-consent-error` : undefined}
            {...register('consent')}
          />
          <Label htmlFor={`${formId}-consent`} className="font-normal text-ink-600">
            I agree to be contacted about my enquiry and accept the{' '}
            <a
              href="/privacy-policy"
              className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-600"
            >
              privacy policy
            </a>
            .
          </Label>
        </div>
        <FieldError id={`${formId}-consent-error`}>{errors.consent?.message}</FieldError>
      </div>

      <Honeypot {...register('website')} />

      <Button type="submit" variant="primary" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden className="animate-spin" />
            Sending your message
          </>
        ) : (
          <>
            Send Message &amp; Claim 50% OFF
            <Send aria-hidden />
          </>
        )}
      </Button>

      <p className="text-center font-sans text-xs text-ink-400">
        We reply within one working day. Your details are never sold or shared.
      </p>
    </form>
  )
}
