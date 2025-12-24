import type { ReactNode } from "react";
import { Children as ReactChildren, isValidElement } from "react";

/**
 * Strip section number prefixes (e.g., "9.11.5 ", "D.1 ", "C.4 ") from text
 */
export function stripSectionPrefix(text: string): string {
  return text.replace(/^[A-Za-z]?[\d.]+\s+/, "");
}

/**
 * Helper to extract text content from React children
 */
export function getTextContent(children: ReactNode): string {
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

