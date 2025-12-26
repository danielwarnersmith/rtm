import type { ComponentPropsWithoutRef } from "react";
import type { JSX } from "react";

/**
 * Custom inline code styling.
 */
export function CustomCode(props: ComponentPropsWithoutRef<"code">): JSX.Element {
  return (
    <code
      {...props}
      className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
    />
  );
}

