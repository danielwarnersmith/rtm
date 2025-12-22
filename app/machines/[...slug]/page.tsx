import { notFound } from "next/navigation";
import { allMachines } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer2/hooks";
import { MDXComponents } from "@/components/mdx/MDXComponents";
import { TableOfContents } from "@/components/TableOfContents";
import type { Metadata } from "next";

interface MachinePageProps {
  params: Promise<{
    slug: string[];
  }>;
}

/**
 * Generate static paths for all machine manual pages.
 * This enables full static generation at build time.
 */
export async function generateStaticParams() {
  return allMachines.map((machine) => ({
    slug: machine.slug.split("/"),
  }));
}

/**
 * Generate metadata for SEO and social sharing.
 */
export async function generateMetadata(
  { params }: MachinePageProps
): Promise<Metadata> {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const machine = allMachines.find((m) => m.slug === slugPath);

  if (!machine) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: machine.title,
    description: machine.description,
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
 * Machine manual page component.
 * Renders a single MDX document based on the slug parameter.
 */
export default async function MachinePage({ params }: MachinePageProps) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const machine = allMachines.find((m) => m.slug === slugPath);

  // Return 404 if document not found
  if (!machine) {
    notFound();
  }

  return (
    <>
      <article className="prose prose-neutral max-w-3xl px-4 dark:prose-invert">
        {/* Document Header */}
        <header className="pb-8">
          <h1 className="mb-2 text-[32px] font-extrabold leading-tight tracking-tight">{machine.title}</h1>
          {machine.description && (
            <p className="mt-4 mb-4 text-lg text-neutral-600 dark:text-neutral-400">
              {machine.description}
            </p>
          )}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500">
              {machine.date && (
                <time>
                  {new Date(machine.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              )}
              {machine.tags && machine.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {machine.tags.map((tag) => (
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
        <MDXContent code={machine.body.code} />
      </article>

      {/* Floating Table of Contents */}
      <TableOfContents />
    </>
  );
}
