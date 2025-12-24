import type { ReactNode } from "react";

/**
 * Key name component - for physical keys like [FUNC], [PLAY], [TRIG 1-16]
 * Convention: "Key names are written in upper case, bold style and bracketed letters"
 */
export function Key({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold">[{children}]</strong>;
}

