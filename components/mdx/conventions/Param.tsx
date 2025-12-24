import type { ReactNode } from "react";

/**
 * Parameter name component - for parameter names like VOL, FREQ, DECAY
 * Convention: "Parameter names are written in bold, upper case letters"
 */
export function Param({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold">{children}</strong>;
}

