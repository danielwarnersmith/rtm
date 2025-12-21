import Link from "next/link";
import { allMachines } from "contentlayer/generated";

/**
 * Home page displaying a list of all machine manuals.
 * Content is statically generated from Contentlayer at build time.
 */
export default function HomePage() {
  // Sort machines by date (newest first), falling back to title
  const sortedMachines = allMachines.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
          Machine Manuals
        </h1>
        <p className="max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
          Owner&apos;s manuals for drum machines and synthesizers. Use the{" "}
          <Link href="/search" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400">
            search page
          </Link>{" "}
          to find specific content.
        </p>
      </section>

      {/* Machine List */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          All Machines
        </h2>
        
        {sortedMachines.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400">
            No machine manuals found. Add MDX files to{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-neutral-800">
              content/machines/
            </code>
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {sortedMachines.map((machine) => (
              <li key={machine.slug}>
                <Link
                  href={machine.url}
                  className="group block h-full rounded-lg border border-neutral-200 p-5 transition-all hover:border-indigo-500 hover:shadow-md dark:border-neutral-800 dark:hover:border-indigo-500"
                >
                  <h3 className="font-semibold text-neutral-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {machine.title}
                  </h3>
                  {machine.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {machine.description}
                    </p>
                  )}
                  {machine.tags && machine.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {machine.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {machine.date && (
                    <time className="mt-3 block text-xs text-neutral-500 dark:text-neutral-500">
                      {new Date(machine.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

