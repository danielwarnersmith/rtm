import Image from "next/image";
import type { ReactNode } from "react";
import { withBasePath } from "@/lib/basePath";

interface CalloutProps {
  children: ReactNode;
}

/**
 * Tip callout component.
 * Displays helpful tips with the Elektron tip icon.
 */
export function Tip({ children }: CalloutProps) {
  return (
    <div className="my-6 flex gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex-shrink-0">
        <Image
          src={withBasePath("/icons/tip.jpeg") ?? "/icons/tip.jpeg"}
          alt="Tip"
          width={24}
          height={24}
          className="mt-0.5"
        />
      </div>
      <div className="text-neutral-700 dark:text-neutral-300 [&>p]:my-0">{children}</div>
    </div>
  );
}

