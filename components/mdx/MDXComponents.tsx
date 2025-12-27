/**
 * Centralized MDX component mapping.
 * Re-exports components from focused modules and provides the component registry.
 */

// Base HTML element overrides
import {
  CustomLink,
  CustomCode,
  CustomImg,
  createHeading,
  CustomTable,
  CustomThead,
  CustomTh,
  CustomTd,
  CustomTr,
  CustomUl,
  CustomOl,
} from "./base";

// Callout components
import { Tip, Warning, Footnotes, Footnote } from "./callouts";

// Elektron manual convention components
import { Key, Knob, LED, Param } from "./conventions";

// Diagram components
import { SignalPathDiagram } from "./diagrams";

/**
 * MDX component mapping.
 * Maps HTML elements and custom components to their implementations.
 */
export const MDXComponents = {
  // HTML element overrides
  a: CustomLink,
  code: CustomCode,
  img: CustomImg,
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
  // Callout components
  Tip,
  Warning,
  // Inline convention components
  Key,
  Knob,
  LED,
  Param,
  // Footnote components
  Footnotes,
  Footnote,
  // Diagram components
  SignalPathDiagram,
};
