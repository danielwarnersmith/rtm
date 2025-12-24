"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { allMachines } from "contentlayer/generated";
import { BASE_PATH } from "@/lib/basePath";
import type { Pagefind, PagefindResult, GroupedResult } from "@/types/pagefind";

/**
 * Normalize Pagefind URLs by removing .html extension.
 */
function normalizeUrl(url: string): string {
  let pathname = url;
  try {
    pathname = new URL(url, "https://example.invalid").pathname;
  } catch {
    // If it's not a valid URL, treat it as a pathname.
    pathname = url;
  }

  // If Pagefind returns a URL that already includes the basePath, strip it so
  // Next.js can re-apply basePath consistently via <Link />.
  if (BASE_PATH && pathname.startsWith(`${BASE_PATH}/`)) {
    pathname = pathname.slice(BASE_PATH.length);
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;

  // Next.js static export for nested routes is typically `.../index.html`.
  // Convert those (and any `.html`) into directory-style paths.
  pathname = pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "/");

  // GitHub Pages doesn't do "pretty URL" fallbacks, so always use trailing slashes.
  if (pathname !== "/" && !pathname.endsWith("/")) pathname += "/";

  return pathname;
}

/**
 * Group and consolidate search results by page.
 * Clusters nearby mentions and limits total mentions per page.
 */
function groupResults(results: PagefindResult[]): GroupedResult[] {
  const grouped: GroupedResult[] = [];

  for (const result of results) {
    const baseUrl = normalizeUrl(result.url);
    const mentions: GroupedResult["mentions"] = [];

    // Use sub_results if available, otherwise fall back to main result
    if (result.sub_results && result.sub_results.length > 0) {
      for (const sub of result.sub_results) {
        mentions.push({
          id: `${result.id}-${sub.anchor?.id || mentions.length}`,
          anchor: sub.anchor?.id,
          excerpt: sub.excerpt,
          title: sub.anchor?.text || sub.title || "",
        });
      }
    } else {
      mentions.push({
        id: result.id,
        anchor: undefined,
        excerpt: result.excerpt,
        title: "",
      });
    }

    grouped.push({
      id: result.id,
      url: baseUrl,
      title: result.meta.title || "Untitled",
      mentions: mentions.slice(0, 5), // Limit to 5 mentions per page
    });
  }

  return grouped;
}

/**
 * Home page with integrated search.
 * Shows machine list as null state, search results when querying.
 */
export default function HomePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPagefindLoaded, setIsPagefindLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pagefindRef = useRef<Pagefind | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sort machines by date (newest first)
  const sortedMachines = [...allMachines].sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return a.title.localeCompare(b.title);
  });

  /**
   * Initialize Pagefind on component mount.
   */
  useEffect(() => {
    async function loadPagefind() {
      try {
        const pagefind = await import(
          // Pagefind is generated at build time and served as a static asset.
          /* webpackIgnore: true */ `${BASE_PATH}/pagefind/pagefind.js`
        );
        await pagefind.init();
        pagefindRef.current = pagefind;
        setIsPagefindLoaded(true);
      } catch (err) {
        console.warn("Pagefind not loaded:", err);
        setError(
          "Search is only available after building the site. Run 'npm run build' to enable search."
        );
      }
    }

    loadPagefind();
  }, []);

  /**
   * Keyboard shortcut: Cmd/Ctrl + K to focus search
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /**
   * Perform search with debouncing.
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

      const loadedResults = await Promise.all(
        search.results.slice(0, 10).map(async (result) => {
          const data = await result.data();
          return data;
        })
      );

      setResults(groupResults(loadedResults));
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

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch]
  );

  const showSearchResults = query.trim() && isPagefindLoaded && !error;

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-[28px] font-semibold leading-tight text-neutral-900 dark:text-white">
          Machine Manuals
        </h1>
      </section>

      {/* Search Input */}
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleSearch("");
              e.currentTarget.blur();
            }
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder="Search..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 pr-12 text-neutral-900 placeholder-neutral-500 shadow-sm transition-colors focus:border-neutral-900 focus:outline-none focus:ring-0 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-400 dark:focus:border-white"
          disabled={!isPagefindLoaded && !error}
        />
        {isLoading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          </div>
        ) : query && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 active:bg-neutral-100 hover:text-neutral-600 active:text-neutral-600 dark:hover:bg-neutral-800 dark:active:bg-neutral-800 dark:hover:text-neutral-300 dark:active:text-neutral-300"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {showSearchResults && results.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {results.length} manual{results.length === 1 ? "" : "s"} with matches
          </h2>
          <ul className="space-y-4">
            {results.map((result) => (
              <li key={result.id}>
                <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
                  {/* Manual title */}
                  <Link
                    href={result.url}
                    className="font-semibold text-neutral-900 hover:underline dark:text-white"
                  >
                    {result.title}
                  </Link>
                  <span className="ml-2 text-xs text-neutral-500">
                    {result.mentions.length} mention{result.mentions.length === 1 ? "" : "s"}
                  </span>

                  {/* Mentions list */}
                  <ul className="mt-3 space-y-2">
                    {result.mentions.map((mention) => {
                      const mentionUrl = mention.anchor
                        ? `${result.url}#${mention.anchor}`
                        : result.url;
                      return (
                        <li key={mention.id}>
                          <Link
                            href={mentionUrl}
                            className="group block rounded-md p-3 -mx-3 transition-colors hover:bg-neutral-50/50 active:bg-neutral-50/50 dark:hover:bg-neutral-800/30 dark:active:bg-neutral-800/30"
                          >
                            {mention.title && (
                              <span className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                {mention.title}
                              </span>
                            )}
                            <span
                              className="block text-sm text-neutral-600 dark:text-neutral-400 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-500/40 [&_mark]:dark:text-yellow-100 [&_mark]:px-0.5 [&_mark]:rounded"
                              dangerouslySetInnerHTML={{ __html: mention.excerpt }}
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* No Results Message */}
      {showSearchResults && !isLoading && results.length === 0 && (
        <p className="text-neutral-600 dark:text-neutral-400">
          No results found for &ldquo;{query}&rdquo;. Try a different search term.
        </p>
      )}

      {/* Machine List (null state when no search query) */}
      {!showSearchResults && (
        <section className="space-y-4">
          {sortedMachines.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">
              No machine manuals found. Add MDX files to{" "}
              <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-neutral-800">
                content/machines/
              </code>
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {sortedMachines.map((machine) => (
                <li key={machine.slug}>
                  <Link
                    href={machine.url}
                    className="group block h-full rounded-lg border border-neutral-200 p-5 transition-all hover:bg-neutral-50/50 active:bg-neutral-50/50 dark:border-neutral-800 dark:hover:bg-neutral-800/30 dark:active:bg-neutral-800/30"
                  >
                    <h3 className="font-semibold text-neutral-900 dark:text-white">
                      {machine.title}
                    </h3>
                    {machine.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                        {machine.description}
                      </p>
                    )}
                    {machine.tags && machine.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {machine.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {machine.date && (
                      <time className="mt-3 block text-xs text-neutral-500 dark:text-neutral-500">
                        {new Date(machine.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
