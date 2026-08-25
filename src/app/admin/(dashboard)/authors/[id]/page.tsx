import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { AdminPageHeader } from '@/components/admin/page-header'
import { DeleteButton } from '@/components/admin/delete-button'
import { getDb } from '@/db'
import { authors } from '@/db/schema'
import { fromLines, type AuthorFormValues } from '@/lib/admin/schemas'

import { deleteAuthor, updateAuthor } from '../actions'
import { AuthorForm } from '../author-form'
import { authorFields } from '../fields'

type Params = { id: string }

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { id } = await params
  const [row] = await getDb()
    .select({ name: authors.name })
    .from(authors)
    .where(eq(authors.id, id))
    .limit(1)

  return { title: row?.name ?? 'Author' }
}

export default async function EditAuthorPage({ params }: { params: Promise<Params> }) {
  const { id } = await params

  const [row] = await getDb().select().from(authors).where(eq(authors.id, id)).limit(1)
  if (!row) notFound()

  async function save(values: AuthorFormValues) {
    'use server'
    return updateAuthor(id, values)
  }

  return (
    <>
      <AdminPageHeader
        title={row.name}
        description={row.role}
        backHref="/admin/authors"
        backLabel="All authors"
        actions={
          <DeleteButton
            label={`Delete ${row.name}`}
            itemName={row.name}
            redirectTo="/admin/authors"
            onDelete={deleteAuthor.bind(null, id)}
          />
        }
      />

      <AuthorForm
        fields={authorFields}
        sectionTitle="Instructor profile"
        defaultValues={{
          slug: row.slug,
          name: row.name,
          role: row.role,
          credentials: row.credentials,
          bio: row.bio,
          longBio: fromLines(row.longBio),
          avatar: row.avatar,
          expertise: fromLines(row.expertise),
          yearsExperience: row.yearsExperience,
          linkedin: row.social.linkedin ?? '',
          twitter: row.social.twitter ?? '',
          github: row.social.github ?? '',
          email: row.social.email ?? '',
        }}
        onSubmitAction={save}
        cancelHref="/admin/authors"
        submitLabel="Save author"
        successMessage="Author updated"
      />
    </>
  )
}
