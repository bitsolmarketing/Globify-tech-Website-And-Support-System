import * as React from 'react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Thin wrappers over a plain `<table>`, styled with the same brand tokens as
 * the public site. A real table (rather than a grid of divs) keeps row/column
 * semantics for screen readers and makes copy-paste into a spreadsheet work.
 */
export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Wide tables scroll inside the card instead of the page. */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left font-sans text-sm">{children}</table>
      </div>
    </Card>
  )
}

export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-hairline bg-ink-50/60">{children}</thead>
}

export function Th({
  children,
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-3 font-sans text-[0.6875rem] font-bold tracking-[0.08em] text-ink-500 uppercase whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-hairline">{children}</tbody>
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn('transition-colors hover:bg-ink-50/50', className)}>{children}</tr>
}

export function Td({
  children,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3.5 align-middle text-ink-700', className)} {...props}>
      {children}
    </td>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <Card className="grid place-items-center gap-3 px-6 py-16 text-center">
      <h2 className="font-sans text-lg font-bold text-ink-900">{title}</h2>
      {description && <p className="max-w-md text-[0.9375rem] text-ink-500">{description}</p>}
      {action}
    </Card>
  )
}
