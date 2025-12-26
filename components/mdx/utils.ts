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

/**
 * Utility to build className strings from multiple sources.
 * Filters out falsy values and joins with spaces.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ").trim();
}

/**
 * Common regex patterns used across components
 */
export const REGEX_PATTERNS = {
  /** Matches section numbers like "1.", "1.1", "1.1.1" */
  SECTION_NUMBER: /^(\d+(?:\.\d+)*)/,
  /** Matches purely numeric strings */
  NUMERIC: /^\d+$/,
  /** Matches separator rows (all dashes) */
  SEPARATOR_ROW: /^-+$/,
  /** Matches heading tags */
  HEADING_TAG: /^H[1-6]$/,
} as const;

