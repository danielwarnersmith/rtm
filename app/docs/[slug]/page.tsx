import { notFound } from "next/navigation";
import { allDocs } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer2/hooks";
import { MDXComponents } from "@/components/mdx/MDXComponents";
import type { Metadata } from "next";

interface DocPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * Generate static paths for all documentation pages.
 * This enables full static generation at build time.
 */
export async function generateStaticParams() {
  return allDocs.map((doc) => ({
    slug: doc.slug,
  }));
}

/**
 * Generate metadata for SEO and social sharing.
 */
export async function generateMetadata(
  { params }: DocPageProps
): Promise<Metadata> {
  const { slug } = await params;
  const doc = allDocs.find((doc) => doc.slug === slug);

  if (!doc) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: doc.title,
    description: doc.description,
  };
}

/**
 * MDX content renderer component.
 * Uses the useMDXComponent hook to render compiled MDX.
 */
function MDXContent({ code }: { code: string }) {
  const Component = useMDXComponent(code);
  return <Component components={MDXComponents} />;
}

/**
 * Documentation page component.
 * Renders a single MDX document based on the slug parameter.
 */
export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = allDocs.find((doc) => doc.slug === slug);

  // Return 404 if document not found
  if (!doc) {
    notFound();
  }

  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert">
      {/* Document Header */}
      <header className="mb-8 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <h1 className="mb-2">{doc.title}</h1>
        {doc.description && (
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            {doc.description}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
          {doc.date && (
            <time>
              {new Date(doc.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          )}
          {doc.tags && doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium dark:bg-neutral-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* MDX Content - wrapped in prose for typography styling */}
      <MDXContent code={doc.body.code} />
    </article>
  );
}

