'use client'

import { Toaster as SonnerToaster } from 'sonner'

/** Brand-styled toast host. Mounted once in the root layout. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            'font-sans rounded-2xl border border-hairline bg-white shadow-lift text-ink-800 text-sm',
          title: 'font-bold text-ink-900',
          description: 'text-ink-600',
          actionButton: 'bg-brand-900 text-white rounded-lg',
          cancelButton: 'bg-ink-100 text-ink-700 rounded-lg',
        },
      }}
    />
  )
}

export { toast } from 'sonner'
