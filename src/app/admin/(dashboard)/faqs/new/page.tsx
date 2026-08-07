import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { SimpleForm } from '@/components/admin/simple-form'
import { faqFormSchema } from '@/lib/admin/schemas'
import { getFaqCategories } from '@/lib/data/content'

import { createFaq } from '../actions'
import { faqFields } from '../fields'

export const metadata: Metadata = { title: 'New FAQ' }

export default async function NewFaqPage() {
  const categories = await getFaqCategories()

  return (
    <>
      <AdminPageHeader title="New FAQ" backHref="/admin/faqs" backLabel="All FAQs" />

      <SimpleForm
        schema={faqFormSchema}
        fields={faqFields(categories)}
        sectionTitle="Question and answer"
        sectionDescription="Appears on /faqs, grouped by category, and in FAQPage schema."
        defaultValues={{
          question: '',
          answer: '',
          category: categories[0] ?? 'Admissions',
          showOnHomepage: false,
        }}
        onSubmitAction={createFaq}
        cancelHref="/admin/faqs"
        submitLabel="Create FAQ"
        successMessage="FAQ created"
      />
    </>
  )
}
