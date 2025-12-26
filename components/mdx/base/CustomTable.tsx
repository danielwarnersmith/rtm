import type { ComponentPropsWithoutRef } from "react";
import { Children as ReactChildren, isValidElement } from "react";
import { getTextContent } from "../utils";
import { ClickableTableRow } from "../ClickableTableRow";

/**
 * Custom table wrapper with horizontal scroll support.
 */
export function CustomTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table
        {...props}
        className="w-full min-w-full border-collapse border-t border-neutral-200 text-sm dark:border-neutral-700"
        style={{ borderTopWidth: '0.5px' }}
      />
    </div>
  );
}

/**
 * Custom table head that hides TOC-style headers.
 */
export function CustomThead(props: ComponentPropsWithoutRef<"thead">) {
  const { children, ...rest } = props;
  
  // Hide TOC-style headers (Section | Page)
  const text = getTextContent(children).trim();
  if (text === "Section Page") {
    return null;
  }
  
  return (
    <thead {...rest}>
      {children}
    </thead>
  );
}

/**
 * Custom table header cell with smart alignment.
 */
export function CustomTh(props: ComponentPropsWithoutRef<"th">) {
  const { children, style, align, ...rest } = props;
  // Check for explicit alignment from markdown (e.g., |:---|)
  const hasExplicitAlign = style?.textAlign || align;
  
  // Right-align only if no explicit alignment AND content looks numeric or is "Page"
  const text = typeof children === "string" ? children.trim() : "";
  const isNumericColumn = text === "Page" || /^\d+$/.test(text);
  const shouldRightAlign = !hasExplicitAlign && isNumericColumn;
  
  return (
    <th
      {...rest}
      style={style}
      className={`first:pl-4 last:pr-4 py-2 font-semibold text-neutral-900 dark:text-neutral-100 ${
        shouldRightAlign ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/**
 * Custom table data cell with smart alignment.
 */
export function CustomTd(props: ComponentPropsWithoutRef<"td">) {
  const { children, style, align, ...rest } = props;
  // Check for explicit alignment from markdown (e.g., |:---|)
  const hasExplicitAlign = style?.textAlign || align;
  
  // Right-align only if no explicit alignment AND content is purely numeric
  const text = typeof children === "string" ? children.trim() : "";
  const isNumeric = /^\d+$/.test(text);
  const shouldRightAlign = !hasExplicitAlign && isNumeric;
  
  return (
    <td
      {...rest}
      style={{ borderBottomWidth: '0.5px', ...style }}
      className={`border-b border-neutral-200 first:pl-4 last:pr-4 py-2 dark:border-neutral-700 ${
        shouldRightAlign
          ? "text-right tabular-nums text-neutral-500 dark:text-neutral-400"
          : "text-left text-neutral-700 dark:text-neutral-300"
      }`}
    >
      {children}
    </td>
  );
}

/**
 * Custom table row with smart hiding and click behavior.
 */
export function CustomTr(props: ComponentPropsWithoutRef<"tr">) {
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
  
  // Hide rows where ALL cells contain only dashes (separator rows)
  if (cells.length > 0 && cells.every(cell => /^-+$/.test(cell))) {
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

