"use client";

import { memo, useMemo, useCallback } from "react";
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

function ClickableTableRowComponent({ children, shouldHide, ...rest }: ClickableTableRowProps) {
  // Memoize href lookup to avoid re-computation on every render
  // Hooks must be called before any early returns
  const rowHref = useMemo(() => findFirstHref(children), [children]);
  
  // Memoize click handler
  const handleRowClick = useCallback(() => {
    if (!rowHref) return;
    
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
  }, [rowHref]);
  
  // Memoize className
  const className = useMemo(() => {
    return `hover:bg-neutral-50 active:bg-neutral-50 dark:hover:bg-neutral-800/50 dark:active:bg-neutral-800/50 ${rowHref ? 'cursor-pointer' : ''}`;
  }, [rowHref]);
  
  if (shouldHide) {
    return null;
  }
  
  return (
    <tr
      {...rest}
      className={className}
      onClick={rowHref ? handleRowClick : undefined}
    >
      {children}
    </tr>
  );
}

// Memoize component to prevent unnecessary re-renders
export const ClickableTableRow = memo(ClickableTableRowComponent);

