import type { ComponentPropsWithoutRef } from "react";

/**
 * Custom unordered list styling.
 */
export function CustomUl(props: ComponentPropsWithoutRef<"ul">) {
  return <ul {...props} />;
}

/**
 * Custom ordered list styling.
 */
export function CustomOl(props: ComponentPropsWithoutRef<"ol">) {
  return <ol {...props} className="list-decimal" />;
}

