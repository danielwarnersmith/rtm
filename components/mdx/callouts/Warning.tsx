import Image from "next/image";
import type { ReactNode } from "react";
import { withBasePath } from "@/lib/basePath";

interface CalloutProps {
  children: ReactNode;
}

/**
 * Warning callout component.
 * Displays important warnings with the Elektron warning icon.
 */
export function Warning({ children }: CalloutProps) {
  return (
    <div className="my-6 flex gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
      <div className="flex-shrink-0">
        <Image
          src={withBasePath("/icons/warning.jpeg") ?? "/icons/warning.jpeg"}
          alt="Warning"
          width={24}
          height={24}
          className="mt-0.5"
        />
      </div>
      <div className="text-amber-900 dark:text-amber-100 [&>p]:my-0">{children}</div>
    </div>
  );
}

