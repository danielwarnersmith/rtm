import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import type { JSX } from "react";
import { stripSectionPrefix } from "../utils";

/**
 * Custom anchor component that uses Next.js Link for internal navigation.
 * External links open in a new tab with security attributes.
 */
export function CustomLink(props: ComponentPropsWithoutRef<"a">): JSX.Element {
  const href = props.href;
  const { children, ...rest } = props;

  // Handle internal links with Next.js Link
  if (href && href.startsWith("/")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }

  // Handle anchor links - strip section number prefixes from display
  if (href && href.startsWith("#")) {
    const text = typeof children === "string" ? children : "";
    const displayText = text ? stripSectionPrefix(text) : children;
    return <a {...rest} href={href}>{displayText}</a>;
  }

  // External links open in new tab with security attributes
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
    >
      {children}
    </a>
  );
}

