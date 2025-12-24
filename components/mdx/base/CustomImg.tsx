import type { ComponentPropsWithoutRef } from "react";
import { withBasePath } from "@/lib/basePath";

/**
 * Custom image component with lazy loading and base path support.
 */
export function CustomImg(props: ComponentPropsWithoutRef<"img">) {
  const { src, alt, ...rest } = props;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={withBasePath(src)}
      alt={alt ?? ""}
      loading="lazy"
      className={[
        "my-6 h-auto max-w-full rounded-md",
        typeof props.className === "string" ? props.className : "",
      ].join(" ").trim()}
    />
  );
}

