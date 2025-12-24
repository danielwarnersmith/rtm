import type { ReactNode } from "react";

/**
 * Knob name component - for rotary controls like TRACK LEVEL, DATA ENTRY
 * Convention: "Knobs are written in upper case, bold, italic letters"
 */
export function Knob({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold italic">{children}</strong>;
}

