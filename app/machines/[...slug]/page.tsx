import { notFound } from "next/navigation";
import { allMachines } from "contentlayer/generated";
import { TableOfContents } from "@/components/TableOfContents";
import { StickyTitle } from "@/components/StickyTitle";
import { MDXContent } from "./MDXContent";
import { MachineMetadata } from "@/components/MachineMetadata";
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
      <article className="prose prose-neutral max-w-3xl px-4 dark:prose-invert w-full overflow-x-hidden">
        {/* Document Header - wrapped in StickyTitle for scroll detection */}
        <StickyTitle title={machine.title}>
          <header className="pb-8">
            <h1 className="mb-2 text-[32px] font-extrabold leading-tight tracking-tight">{machine.title}</h1>
            {machine.description && (
              <p className="mt-4 mb-4 text-lg text-neutral-600 dark:text-neutral-400">
                {machine.description}
              </p>
            )}
            <MachineMetadata date={machine.date} tags={machine.tags} />
          </header>
        </StickyTitle>

        {/* MDX Content - wrapped in prose for typography styling */}
        <MDXContent code={machine.body.code} />
      </article>

      {/* Floating Table of Contents */}
      <TableOfContents />
    </>
  );
}
