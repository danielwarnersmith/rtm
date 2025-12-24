import type { ReactNode } from "react";

/**
 * LED indicator component - for LED displays like <PATTERN PAGE>, <OCTAVE>
 * Convention: "LED indicators are written like this: <OCTAVE>"
 */
export function LED({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold">&lt;{children}&gt;</strong>;
}

