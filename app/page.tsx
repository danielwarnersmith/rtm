"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { allMachines } from "contentlayer/generated";
import { BASE_PATH } from "@/lib/basePath";
import { sortMachinesByDate } from "@/lib/machines";
import { MachineMetadata } from "@/components/MachineMetadata";
import { SearchInput, SearchResults } from "@/components/Search";
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
  const sortedMachines = sortMachinesByDate(allMachines);

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

  const showSearchResults = Boolean(query.trim() && isPagefindLoaded && !error);

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-[28px] font-semibold leading-tight text-neutral-900 dark:text-white">
          Machine Manuals
        </h1>
      </section>

      {/* Search Input */}
      <SearchInput
        ref={searchInputRef}
        value={query}
        onChange={handleSearch}
        isLoading={isLoading}
        isPagefindLoaded={isPagefindLoaded}
        error={error}
      />

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">{error}</p>
        </div>
      )}

      {/* Search Results */}
      <SearchResults
        results={results}
        query={query}
        isLoading={isLoading}
        showSearchResults={showSearchResults}
      />

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
                    <MachineMetadata date={machine.date} tags={machine.tags} layout="vertical" />
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
