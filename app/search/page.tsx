"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Pagefind search result type.
 * Matches the structure returned by Pagefind's search API.
 */
interface PagefindResult {
  id: string;
  url: string;
  excerpt: string;
  meta: {
    title?: string;
  };
}

interface PagefindSearchResult {
  results: Array<{
    id: string;
    data: () => Promise<PagefindResult>;
  }>;
}

interface Pagefind {
  init: () => Promise<void>;
  search: (query: string) => Promise<PagefindSearchResult>;
}

/**
 * Normalize Pagefind URLs by removing .html extension.
 * Pagefind indexes static HTML files, but Next.js routes don't use extensions.
 */
function normalizeUrl(url: string): string {
  return url.replace(/\.html$/, "");
}

/**
 * Search page with client-side Pagefind integration.
 * Pagefind indexes are generated at build time from static HTML output.
 */
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPagefindLoaded, setIsPagefindLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pagefindRef = useRef<Pagefind | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /**
   * Initialize Pagefind on component mount.
   * Pagefind is loaded dynamically from the public directory.
   */
  useEffect(() => {
    async function loadPagefind() {
      try {
        // Dynamically import Pagefind from public directory
        const pagefind = await import(
          // @ts-expect-error - Pagefind is generated at build time
          /* webpackIgnore: true */ "/pagefind/pagefind.js"
        );
        await pagefind.init();
        pagefindRef.current = pagefind;
        setIsPagefindLoaded(true);
      } catch (err) {
        // Pagefind may not be available in development
        console.warn("Pagefind not loaded:", err);
        setError(
          "Search is only available after building the site. Run 'npm run build' to enable search."
        );
      }
    }

    loadPagefind();
  }, []);

  /**
   * Perform search with debouncing.
   * Debouncing prevents excessive API calls while typing.
   */
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!pagefindRef.current || !searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const search = await pagefindRef.current.search(searchQuery);
      
      // Load full data for each result
      const loadedResults = await Promise.all(
        search.results.slice(0, 10).map(async (result) => {
          const data = await result.data();
          return data;
        })
      );

      setResults(loadedResults);
    } catch (err) {
      console.error("Search error:", err);
      setError("An error occurred while searching.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle search input changes with debouncing.
   */
  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);

      // Clear previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce search by 300ms
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch]
  );

  return (
    <div className="space-y-8">
      {/* Search Header */}
      <section className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Search Documentation
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Search across all documentation pages using full-text search powered by{" "}
          <a
            href="https://pagefind.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
          >
            Pagefind
          </a>
          .
        </p>
      </section>

      {/* Search Input */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type to search..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder-neutral-500 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-400 dark:focus:border-indigo-500"
          disabled={!isPagefindLoaded && !error}
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {results.length} result{results.length === 1 ? "" : "s"} found
          </h2>
          <ul className="space-y-4">
            {results.map((result) => {
              const url = normalizeUrl(result.url);
              return (
                <li key={result.id}>
                  <Link
                    href={url}
                    className="group block rounded-lg border border-neutral-200 p-5 transition-all hover:border-indigo-500 hover:shadow-md dark:border-neutral-800 dark:hover:border-indigo-500"
                  >
                    <h3 className="font-semibold text-neutral-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                      {result.meta.title || "Untitled"}
                    </h3>
                    <p
                      className="mt-2 text-sm text-neutral-600 dark:text-neutral-400"
                      dangerouslySetInnerHTML={{ __html: result.excerpt }}
                    />
                    <span className="mt-2 block text-xs text-neutral-500">
                      {url}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* No Results Message */}
      {query && !isLoading && results.length === 0 && !error && isPagefindLoaded && (
        <p className="text-neutral-600 dark:text-neutral-400">
          No results found for &ldquo;{query}&rdquo;. Try a different search term.
        </p>
      )}

      {/* Initial State */}
      {!query && !error && (
        <p className="text-neutral-500 dark:text-neutral-400">
          Start typing to search the documentation.
        </p>
      )}
    </div>
  );
}

