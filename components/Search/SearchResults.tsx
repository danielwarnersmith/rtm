"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GroupedResult } from "@/types/pagefind";

interface SearchResultsProps {
  results: GroupedResult[];
  query: string;
  isLoading: boolean;
  showSearchResults: boolean;
}

/**
 * Search results component displaying grouped search results.
 */
export function SearchResults({ results, query, isLoading, showSearchResults }: SearchResultsProps) {
  const router = useRouter();

  const handleAnchorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Check if this is an anchor link
    const url = new URL(href, window.location.origin);
    if (url.hash) {
      const id = url.hash.slice(1);
      const currentPath = window.location.pathname;
      const targetPath = url.pathname;
      
      // If navigating to a different page, handle navigation and scroll
      if (currentPath !== targetPath) {
        e.preventDefault();
        router.push(url.pathname + url.hash);
        
        // Wait for navigation and DOM to be ready, then scroll to anchor
        const scrollToAnchor = () => {
          const element = document.getElementById(id);
          if (element) {
            // Account for sticky header
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth",
            });
            return true;
          }
          return false;
        };
        
        // Try multiple times with increasing delays to handle page load timing
        const attempts = [100, 300, 500, 1000, 1500];
        attempts.forEach((delay) => {
          setTimeout(() => {
            scrollToAnchor();
          }, delay);
        });
      } else {
        // Same page - just scroll to anchor
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
          // Account for sticky header
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
          // Update URL without navigation
          window.history.pushState(null, "", url.hash);
        }
      }
    }
  }, [router]);

  if (!showSearchResults) {
    return null;
  }

  if (isLoading) {
    return null; // Loading is handled by SearchInput
  }

  if (results.length === 0) {
    return (
      <p className="text-neutral-600 dark:text-neutral-400">
        No results found for &ldquo;{query}&rdquo;. Try a different search term.
      </p>
    );
  }

  return (
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
                        onClick={(e) => {
                          if (mention.anchor) {
                            handleAnchorClick(e, mentionUrl);
                          }
                        }}
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
  );
}

