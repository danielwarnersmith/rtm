import type { ComponentPropsWithoutRef } from "react";
import type { JSX } from "react";
import { getTextContent } from "../utils";

/**
 * Factory function to create custom heading components with IDs for navigation.
 * Strips section number prefixes for cleaner display.
 */
export function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6): (props: ComponentPropsWithoutRef<`h${typeof level}`>) => JSX.Element {
  const Tag = `h${level}` as const;
  
  return function Heading(props: ComponentPropsWithoutRef<typeof Tag>): JSX.Element {
    const { children, ...rest } = props;
    
    // Extract text from children (handles nested elements like spans)
    const text = getTextContent(children);
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    // Strip section number prefixes (e.g., "9.11.5 ", "D.1 ") for display
    const displayText = text.replace(/^[A-Za-z]?[\d.]+\s+/, "");

    return (
      <Tag id={id} {...rest}>
        {displayText}
      </Tag>
    );
  };
}

