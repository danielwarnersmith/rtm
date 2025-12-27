/**
 * Reusable tag component for displaying machine tags.
 */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
      {children}
    </span>
  );
}

