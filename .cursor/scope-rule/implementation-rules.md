# Cursor Project Rules

## Project Overview
This project is a content-driven web app built with:
- Next.js (App Router, TypeScript)
- Local MDX content via Contentlayer
- Tailwind CSS + @tailwindcss/typography
- Static full-text search via Pagefind

Content lives locally in the repository. There is no CMS.

---

## Hard Constraints (Do Not Violate)
- Do NOT introduce a CMS (Sanity, Contentful, etc.)
- Do NOT add authentication
- Do NOT add server-side or API-based search
- Do NOT use the Pages Router
- Do NOT add Redux, Zustand, or other global state libraries
- Do NOT fetch content over HTTP — content is local

---

## Content Rules
- All content comes from `/content/**` as MDX files
- MDX must be processed through Contentlayer
- Frontmatter fields are typed and validated
- Routes are generated from Contentlayer data
- Use static generation only (`generateStaticParams`)

---

## MDX Rendering
- MDX rendering must use a centralized `MDXComponents` map
- Prefer semantic HTML wrapped in Tailwind classes
- Markdown content must be wrapped in:
  `<article className="prose prose-neutral max-w-none">`
- Custom components are preferred over inline styling

---

## Styling Rules
- Tailwind CSS is the only styling system
- Use `@tailwindcss/typography` for base markdown styles
- Override prose styles via Tailwind, not inline CSS
- Mobile-first, responsive by default
- No CSS-in-JS libraries

---

## Search Rules
- Search is implemented using Pagefind
- Pagefind indexes built HTML output only
- Search runs entirely on the client
- No backend or API routes for search

---

## Code Quality
- Prefer clarity over cleverness
- Avoid unnecessary abstraction
- Use TypeScript types from Contentlayer
- Add comments when architectural decisions are non-obvious

---

## When Unsure
If there is ambiguity, prefer:
- Static generation over runtime logic
- Simpler solutions over extensible ones
- Existing project patterns over new ones