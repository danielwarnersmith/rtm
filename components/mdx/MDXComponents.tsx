import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Custom anchor component that uses Next.js Link for internal navigation.
 * External links open in a new tab with security attributes.
 */
function CustomLink(props: ComponentPropsWithoutRef<"a">) {
  const href = props.href;

  // Handle internal links with Next.js Link
  if (href && href.startsWith("/")) {
    return (
      <Link href={href} {...props}>
        {props.children}
      </Link>
    );
  }

  // Handle anchor links
  if (href && href.startsWith("#")) {
    return <a {...props} />;
  }

  // External links open in new tab with security attributes
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  );
}

/**
 * Custom pre element for code blocks.
 * Wraps code in a styled container with optional copy functionality.
 */
function CustomPre(props: ComponentPropsWithoutRef<"pre">) {
  return (
    <pre
      {...props}
      className="overflow-x-auto rounded-lg bg-neutral-900 p-4 text-sm"
    />
  );
}

/**
 * Custom inline code styling.
 * Note: Code blocks within <pre> are handled by rehype-pretty-code.
 */
function CustomCode(props: ComponentPropsWithoutRef<"code">) {
  // Check if this is inside a pre tag (code block) - if so, don't apply inline styles
  // rehype-pretty-code adds data attributes to code blocks
  const isCodeBlock = props["data-language" as keyof typeof props];
  
  if (isCodeBlock) {
    return <code {...props} />;
  }

  // Inline code styling
  return (
    <code
      {...props}
      className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
    />
  );
}

/**
 * Custom blockquote styled as a callout/note.
 * Provides visual emphasis for important information.
 */
function CustomBlockquote(props: ComponentPropsWithoutRef<"blockquote">) {
  return (
    <blockquote
      {...props}
      className="my-6 border-l-4 border-indigo-500 bg-indigo-50 py-4 pl-6 pr-4 dark:bg-indigo-950/30"
    />
  );
}

/**
 * Custom heading components with anchor links.
 * Allows direct linking to specific sections.
 */
function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = `h${level}` as const;
  
  return function Heading(props: ComponentPropsWithoutRef<typeof Tag>) {
    const { children, ...rest } = props;
    
    // Generate ID from children text for anchor linking
    const text = typeof children === "string" ? children : "";
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    return (
      <Tag id={id} {...rest}>
        <a
          href={`#${id}`}
          className="no-underline hover:underline"
          aria-label={`Link to ${text}`}
        >
          {children}
        </a>
      </Tag>
    );
  };
}

/**
 * Centralized MDX component mapping.
 * Override default HTML elements with custom styled components.
 */
export const MDXComponents = {
  a: CustomLink,
  pre: CustomPre,
  code: CustomCode,
  blockquote: CustomBlockquote,
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
};

