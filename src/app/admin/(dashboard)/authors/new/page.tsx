import type { Metadata } from 'next'

import { AdminPageHeader } from '@/components/admin/page-header'
import { SimpleForm } from '@/components/admin/simple-form'
import { authorFormSchema } from '@/lib/admin/schemas'

import { createAuthor } from '../actions'
import { authorFields } from '../fields'

export const metadata: Metadata = { title: 'New author' }

export default function NewAuthorPage() {
  return (
    <>
      <AdminPageHeader
        title="New author"
        description="Instructors and blog authors are the same record."
        backHref="/admin/authors"
        backLabel="All authors"
      />

      <SimpleForm
        schema={authorFormSchema}
        fields={authorFields}
        sectionTitle="Instructor profile"
        defaultValues={{
          slug: '',
          name: '',
          role: '',
          credentials: '',
          bio: '',
          longBio: '',
          avatar: '/images/generated/authors/placeholder.webp',
          expertise: '',
          yearsExperience: 5,
          linkedin: '',
          twitter: '',
          github: '',
          email: '',
        }}
        onSubmitAction={createAuthor}
        cancelHref="/admin/authors"
        submitLabel="Create author"
        successMessage="Author created"
      />
    </>
  )
}
