/**
 * Renders a JSON-LD block. Values come only from our own typed schema
 * builders, never from user input, so there is no injection surface — the
 * `<` escape is belt-and-braces against a stray closing tag inside a string.
 */
export function JsonLd({ data, id }: { data: Record<string, unknown>; id?: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
