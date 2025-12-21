import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Children as ReactChildren, isValidElement } from "react";

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
 * Custom table components for better styling.
 */
function CustomTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 w-full overflow-x-auto">
      <table
        {...props}
        className="min-w-full border-collapse text-sm"
      />
    </div>
  );
}

function CustomThead(props: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      {...props}
      className="border-b border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800"
    />
  );
}

function CustomTh(props: ComponentPropsWithoutRef<"th">) {
  const { children, ...rest } = props;
  // Right-align if content looks numeric or is "Page"
  const text = typeof children === "string" ? children.trim() : "";
  const isNumericColumn = text === "Page" || /^\d+$/.test(text);
  
  return (
    <th
      {...rest}
      className={`px-4 py-2 font-semibold text-neutral-900 dark:text-neutral-100 ${
        isNumericColumn ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function CustomTd(props: ComponentPropsWithoutRef<"td">) {
  const { children, ...rest } = props;
  // Right-align if content is purely numeric
  const text = typeof children === "string" ? children.trim() : "";
  const isNumeric = /^\d+$/.test(text);
  
  return (
    <td
      {...rest}
      className={`border-b border-neutral-200 px-4 py-2 dark:border-neutral-700 ${
        isNumeric
          ? "text-right tabular-nums text-neutral-500 dark:text-neutral-400"
          : "text-neutral-700 dark:text-neutral-300"
      }`}
    >
      {children}
    </td>
  );
}

function CustomTr(props: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      {...props}
      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
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
 * Helper to extract text content from React children
 */
function getTextContent(children: ReactNode): string {
  let text = "";
  ReactChildren.forEach(children, (child) => {
    if (typeof child === "string") {
      text += child;
    } else if (typeof child === "number") {
      text += String(child);
    } else if (isValidElement(child) && child.props.children) {
      text += getTextContent(child.props.children);
    }
  });
  return text;
}

/**
 * Custom unordered list that detects numbered content.
 * If list items start with numbers, renders without bullets.
 */
function CustomUl(props: ComponentPropsWithoutRef<"ul">) {
  const { children, ...rest } = props;
  
  // Check if first li child starts with a number pattern
  let hasNumberedContent = false;
  ReactChildren.forEach(children, (child) => {
    if (isValidElement(child) && child.type === "li") {
      const text = getTextContent(child.props.children).trim();
      if (/^\d+[\.\)]\s/.test(text)) {
        hasNumberedContent = true;
      }
    }
  });

  return (
    <ul
      {...rest}
      className={hasNumberedContent ? "list-none pl-0" : ""}
    >
      {children}
    </ul>
  );
}

/**
 * Custom ordered list styling.
 */
function CustomOl(props: ComponentPropsWithoutRef<"ol">) {
  return <ol {...props} className="list-decimal" />;
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
  table: CustomTable,
  thead: CustomThead,
  th: CustomTh,
  td: CustomTd,
  tr: CustomTr,
  ul: CustomUl,
  ol: CustomOl,
};

