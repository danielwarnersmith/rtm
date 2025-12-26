import type { ComponentPropsWithoutRef } from "react";
import type { JSX } from "react";

/**
 * Custom unordered list styling.
 */
export function CustomUl(props: ComponentPropsWithoutRef<"ul">): JSX.Element {
  return <ul {...props} />;
}

/**
 * Custom ordered list styling.
 */
export function CustomOl(props: ComponentPropsWithoutRef<"ol">): JSX.Element {
  return <ol {...props} className="list-decimal" />;
}

