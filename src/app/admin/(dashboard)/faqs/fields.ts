import type { SimpleField } from '@/components/admin/simple-form'
import type { FaqFormValues } from '@/lib/admin/schemas'

/**
 * Category is free text rather than a fixed list — the public FAQ page derives
 * its section headings from whatever categories exist, so adding one here is
 * all it takes to create a new section.
 */
export function faqFields(categories: string[]): SimpleField<FaqFormValues>[] {
  return [
    { name: 'question', label: 'Question', required: true, full: true },
    { name: 'answer', label: 'Answer', type: 'textarea', rows: 7, required: true },
    {
      name: 'category',
      label: 'Category',
      required: true,
      placeholder: 'Admissions',
      hint:
        categories.length > 0
          ? `Existing: ${categories.join(', ')}`
          : 'A new category creates a new section on /faqs.',
    },
    {
      name: 'showOnHomepage',
      label: 'Show in the homepage FAQ section',
      type: 'checkbox',
    },
  ]
}
