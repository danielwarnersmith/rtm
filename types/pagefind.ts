/**
 * Type definitions for Pagefind search library.
 *
 * Pagefind is a static search library that indexes content at build time.
 * These types describe the search API and result structures.
 */

/**
 * Individual match within a page (sub-result).
 * Represents a specific section/heading where the search term was found.
 */
export interface PagefindSubResult {
  /** Title of the sub-section */
  title: string;
  /** URL to the sub-section */
  url: string;
  /** HTML excerpt with search terms highlighted */
  excerpt: string;
  /** Anchor information if the match is in a specific section */
  anchor?: {
    /** Anchor ID (without #) */
    id: string;
    /** Text of the heading/anchor */
    text: string;
  };
}

/**
 * Full search result for a single page.
 */
export interface PagefindResult {
  /** Unique identifier for this result */
  id: string;
  /** URL of the page */
  url: string;
  /** HTML excerpt with search terms highlighted */
  excerpt: string;
  /** Page metadata */
  meta: {
    /** Page title */
    title?: string;
  };
  /** Sub-results (matches within specific sections of the page) */
  sub_results: PagefindSubResult[];
}

/**
 * Search response from Pagefind.
 */
export interface PagefindSearchResult {
  /** Array of result references (must call data() to get full result) */
  results: Array<{
    /** Result identifier */
    id: string;
    /** Async function to load the full result data */
    data: () => Promise<PagefindResult>;
  }>;
}

/**
 * Pagefind library interface.
 */
export interface Pagefind {
  /** Initialize the Pagefind search index */
  init: () => Promise<void>;
  /** Search for a query string */
  search: (query: string) => Promise<PagefindSearchResult>;
}

/**
 * Grouped search result for display.
 * Consolidates multiple matches from the same page.
 */
export interface GroupedResult {
  /** Result identifier */
  id: string;
  /** Normalized URL to the page */
  url: string;
  /** Page title */
  title: string;
  /** Individual mentions/matches within the page */
  mentions: Array<{
    /** Unique identifier for this mention */
    id: string;
    /** Anchor ID if match is in a specific section */
    anchor?: string;
    /** HTML excerpt with highlighted terms */
    excerpt: string;
    /** Section title */
    title: string;
  }>;
}

