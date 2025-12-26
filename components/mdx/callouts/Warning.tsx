import type { ReactNode } from "react";

interface CalloutProps {
  children: ReactNode;
}

/**
 * Warning callout component.
 * Displays important warnings with the Elektron warning icon.
 * Icon uses theme-responsive foreground color.
 */
export function Warning({ children }: CalloutProps) {
  // Inline SVG with amber/orange color to match warning theme
  const warningIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      className="mt-0.5 w-10 h-10 sm:w-8 sm:h-8"
      aria-label="Warning"
    >
      <path
        className="fill-amber-700 dark:fill-amber-400"
        d="M50 66.69a5 5 0 1 1 0 10.002 5 5 0 0 1 0-10.001Zm0-31.5a5.407 5.407 0 0 1 5.378 5.968L53.496 59.21a3.884 3.884 0 0 1-3.862 3.482 3.782 3.782 0 0 1-3.77-3.49l-1.4-18.028A5.553 5.553 0 0 1 50 35.191Z"
      />
      <path
        className="fill-amber-700 dark:fill-amber-400"
        fillRule="evenodd"
        d="M44.839 14.75c2.324-3.92 7.998-3.92 10.322 0L94.59 81.244c1.818 3.066-.392 6.946-3.956 6.946H9.366c-3.565 0-5.774-3.88-3.956-6.947L44.84 14.75Zm5.59 9.666a.5.5 0 0 0-.859 0l-32.032 54.02a.5.5 0 0 0 .43.755h64.063a.5.5 0 0 0 .43-.755L50.43 24.416Z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div className="my-6 -mx-4 flex flex-col gap-1.5 sm:flex-row sm:gap-4 rounded-lg border border-amber-700 pt-2 pb-4 sm:pt-4 px-4 dark:border-amber-400 sm:mx-0 sm:rounded-lg">
      <div className="flex-shrink-0">{warningIcon}</div>
      <div className="font-normal text-amber-700 dark:text-amber-400 [&>p]:my-0 [&>p]:text-amber-700 [&>p]:dark:text-amber-400 [&>p]:font-normal [&_a]:text-amber-700 [&_a]:dark:text-amber-400 [&_strong]:text-amber-700 [&_strong]:dark:text-amber-400">{children}</div>
    </div>
  );
}

