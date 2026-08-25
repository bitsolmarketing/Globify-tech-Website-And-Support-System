'use client'

import * as React from 'react'
import { ImageOff, Loader2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FieldError, FieldHint, Input, Label } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import type { UploadResult } from '@/lib/admin/image-upload'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  onChange: (path: string) => void
  onBlur?: () => void
  uploadAction: (formData: FormData) => Promise<UploadResult>
  error?: string
  hint?: string
  required?: boolean
  className?: string
}

/**
 * A path text field plus a thumbnail and an upload button that posts straight
 * to a server action. Typing a path still works — this augments the existing
 * "paste a path" fields used across the admin, it doesn't replace them.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  onBlur,
  uploadAction,
  error,
  hint,
  required,
  className,
}: Props) {
  const fieldId = React.useId()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const result = await uploadAction(formData)

      if (!result.ok) {
        toast.error('Upload failed', { description: result.error })
        return
      }

      onChange(result.path)
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed', { description: 'Something went wrong. Try again.' })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>

      <div className="flex items-start gap-4">
        <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-ink-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary local path, not a page image
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageOff aria-hidden className="size-5 text-ink-300" />
          )}
        </div>

        <div className="grid flex-1 gap-2">
          <Input
            id={fieldId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder="/images/uploads/courses/example.webp"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          />

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(event) => handleFile(event.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="justify-self-start"
          >
            {uploading ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Upload aria-hidden />
            )}
            {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
        </div>
      </div>

      {error ? (
        <FieldError id={`${fieldId}-error`}>{error}</FieldError>
      ) : (
        hint && <FieldHint id={`${fieldId}-hint`}>{hint}</FieldHint>
      )}
    </div>
  )
}
