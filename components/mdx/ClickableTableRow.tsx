"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Children as ReactChildren, isValidElement } from "react";

// Helper to find first link href in children
function findFirstHref(children: ReactNode): string | null {
  let href: string | null = null;
  
  ReactChildren.forEach(children, (child) => {
    if (href) return; // Already found
    if (isValidElement(child)) {
      // Check if this is an anchor element
      if (child.type === 'a' || (child.props as { href?: string }).href) {
        href = (child.props as { href?: string }).href || null;
      } else if (child.props.children) {
        // Recursively search children
        href = findFirstHref(child.props.children);
      }
    }
  });
  
  return href;
}

interface ClickableTableRowProps extends ComponentPropsWithoutRef<"tr"> {
  shouldHide?: boolean;
}

export function ClickableTableRow({ children, shouldHide, ...rest }: ClickableTableRowProps) {
  if (shouldHide) {
    return null;
  }
  
  // Find if row contains a link
  const rowHref = findFirstHref(children);
  
  const handleRowClick = rowHref ? () => {
    if (rowHref.startsWith('#')) {
      // Use getElementById to handle IDs that start with numbers
      const id = rowHref.slice(1);
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'instant' });
        history.pushState(null, '', rowHref);
      }
    } else {
      window.location.href = rowHref;
    }
  } : undefined;
  
  return (
    <tr
      {...rest}
      className={`hover:bg-neutral-50 active:bg-neutral-50 dark:hover:bg-neutral-800/50 dark:active:bg-neutral-800/50 ${rowHref ? 'cursor-pointer' : ''}`}
      onClick={handleRowClick}
    >
      {children}
    </tr>
  );
}

