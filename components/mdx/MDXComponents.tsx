import Image from "next/image";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Children as ReactChildren, isValidElement } from "react";
import { ClickableTableRow } from "./ClickableTableRow";

/**
 * Strip section number prefixes (e.g., "9.11.5 ") from text
 */
function stripSectionPrefix(text: string): string {
  return text.replace(/^[\d.]+\s+/, "");
}

/**
 * Custom anchor component that uses Next.js Link for internal navigation.
 * External links open in a new tab with security attributes.
 */
function CustomLink(props: ComponentPropsWithoutRef<"a">) {
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
    <div className="-mx-4 overflow-x-auto">
      <table
        {...props}
        className="w-full border-collapse border-t border-neutral-200 text-sm dark:border-neutral-700"
        style={{ borderTopWidth: '0.5px' }}
      />
    </div>
  );
}

function CustomThead(props: ComponentPropsWithoutRef<"thead">) {
  const { children, ...rest } = props;
  
  // Hide TOC-style headers (Section | Page)
  const text = getTextContent(children).trim();
  if (text === "Section Page") {
    return null;
  }
  
  return (
    <thead
      {...rest}
    >
      {children}
    </thead>
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
      className={`first:pl-4 last:pr-4 py-2 font-semibold text-neutral-900 dark:text-neutral-100 ${
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
      className={`border-b border-neutral-200 first:pl-4 last:pr-4 py-2 dark:border-neutral-700 ${
        isNumeric
          ? "text-right tabular-nums text-neutral-500 dark:text-neutral-400"
          : "text-neutral-700 dark:text-neutral-300"
      }`}
      style={{ borderBottomWidth: '0.5px' }}
    >
      {children}
    </td>
  );
}

function CustomTr(props: ComponentPropsWithoutRef<"tr">) {
  const { children, ...rest } = props;
  
  // Collect cell contents
  const cells: string[] = [];
  ReactChildren.forEach(children, (child) => {
    if (isValidElement(child)) {
      const text = getTextContent(child.props.children).trim();
      cells.push(text);
    }
  });
  
  // Determine if row should be hidden
  let shouldHide = false;
  
  // Hide rows that contain only dashes in any cell (separator rows)
  if (cells.length > 0 && cells.some(cell => /^-+$/.test(cell))) {
    shouldHide = true;
  }
  
  // Hide completely empty rows
  if (cells.length > 0 && cells.every(cell => !cell)) {
    shouldHide = true;
  }
  
  // Hide 2-column TOC rows where either column is empty
  if (cells.length === 2 && (!cells[0] || !cells[1])) {
    shouldHide = true;
  }
  
  // Hide duplicate header rows (e.g., "Section Page" that ended up in tbody)
  const fullText = cells.join(" ").trim();
  if (fullText === "Section Page") {
    shouldHide = true;
  }
  
  return (
    <ClickableTableRow {...rest} shouldHide={shouldHide}>
      {children}
    </ClickableTableRow>
  );
}

/**
 * Custom heading components with IDs for navigation.
 * Strips section number prefixes for cleaner display.
 */
function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = `h${level}` as const;
  
  return function Heading(props: ComponentPropsWithoutRef<typeof Tag>) {
    const { children, ...rest } = props;
    
    // Extract text from children (handles nested elements like spans)
    const text = getTextContent(children);
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    // Strip section number prefixes (e.g., "9.11.5 ") for display
    const displayText = text.replace(/^[\d.]+\s+/, "");

    return (
      <Tag id={id} {...rest}>
        {displayText}
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
 * Callout component props
 */
interface CalloutProps {
  children: ReactNode;
}

/**
 * Tip callout component.
 * Displays helpful tips with the Elektron tip icon.
 */
function Tip({ children }: CalloutProps) {
  return (
    <div className="my-6 flex gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
      <div className="flex-shrink-0">
        <Image
          src="/icons/tip.jpeg"
          alt="Tip"
          width={24}
          height={24}
          className="mt-0.5"
        />
      </div>
      <div className="text-neutral-700 dark:text-neutral-300 [&>p]:my-0">{children}</div>
    </div>
  );
}

/**
 * Warning callout component.
 * Displays important warnings with the Elektron warning icon.
 */
function Warning({ children }: CalloutProps) {
  return (
    <div className="my-6 flex gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-900/20">
      <div className="flex-shrink-0">
        <Image
          src="/icons/warning.jpeg"
          alt="Warning"
          width={24}
          height={24}
          className="mt-0.5"
        />
      </div>
      <div className="text-amber-900 dark:text-amber-100 [&>p]:my-0">{children}</div>
    </div>
  );
}

/**
 * Inline convention components for Elektron manual formatting.
 * These match the conventions described in "Conventions in This Manual" sections.
 */

/**
 * Key name component - for physical keys like [FUNC], [PLAY], [TRIG 1-16]
 * Convention: "Key names are written in upper case, bold style and bracketed letters"
 */
function Key({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold">[{children}]</strong>;
}

/**
 * Knob name component - for rotary controls like TRACK LEVEL, DATA ENTRY
 * Convention: "Knobs are written in upper case, bold, italic letters"
 */
function Knob({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold italic">{children}</strong>;
}

/**
 * LED indicator component - for LED displays like <PATTERN PAGE>, <OCTAVE>
 * Convention: "LED indicators are written like this: <OCTAVE>"
 */
function LED({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold">&lt;{children}&gt;</strong>;
}

/**
 * Screen message component - for on-screen text like "BANK A: CHOOSE PTN"
 * Convention: "Messages visible on the screen are written in upper case letters with quotation marks"
 */
function Screen({ children }: { children: ReactNode }) {
  return <span className="text-[21px] font-medium">&ldquo;{children}&rdquo;</span>;
}

/**
 * Parameter name component - for parameter names like VOL, FREQ, DECAY
 * Convention: "Parameter names are written in bold, upper case letters"
 */
function Param({ children }: { children: ReactNode }) {
  return <strong className="text-[21px] font-semibold">{children}</strong>;
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
  Tip,
  Warning,
  // Inline convention components
  Key,
  Knob,
  LED,
  Screen,
  Param,
};

