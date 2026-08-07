import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { SimpleForm } from '@/components/admin/simple-form'
import { getDb } from '@/db'
import { faqs } from '@/db/schema'
import { faqFormSchema, type FaqFormValues } from '@/lib/admin/schemas'
import { getFaqCategories } from '@/lib/data/content'
import { truncate } from '@/lib/utils'

import { deleteFaq, updateFaq } from '../actions'
import { faqFields } from '../fields'

type Params = { id: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const [row] = await getDb()
    .select({ question: faqs.question })
    .from(faqs)
    .where(eq(faqs.id, id))
    .limit(1)

  return { title: row ? truncate(row.question, 50) : 'FAQ' }
}

export default async function EditFaqPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const [[row], categories] = await Promise.all([
    getDb().select().from(faqs).where(eq(faqs.id, id)).limit(1),
    getFaqCategories(),
  ])

  if (!row) notFound()

  async function save(values: FaqFormValues) {
    'use server'
    return updateFaq(id, values)
  }

  return (
    <>
      <AdminPageHeader
        title={truncate(row.question, 70)}
        description={row.category}
        backHref="/admin/faqs"
        backLabel="All FAQs"
        actions={
          <DeleteButton
            label={`Delete FAQ: ${row.question}`}
            itemName="FAQ"
            redirectTo="/admin/faqs"
            onDelete={deleteFaq.bind(null, id)}
          />
        }
      />

      <SimpleForm
        schema={faqFormSchema}
        fields={faqFields(categories)}
        sectionTitle="Question and answer"
        defaultValues={{
          question: row.question,
          answer: row.answer,
          category: row.category,
          showOnHomepage: row.showOnHomepage,
        }}
        onSubmitAction={save}
        cancelHref="/admin/faqs"
        submitLabel="Save FAQ"
        successMessage="FAQ updated"
      />
    </>
  )
}
