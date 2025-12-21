"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Floating Table of Contents component.
 * Scans the page for headings and displays them in a modal overlay.
 * Includes search functionality scoped to the current manual.
 */
export function TableOfContents() {
  const [isOpen, setIsOpen] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Extract headings from the page on mount
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const elements = article.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const extracted: Heading[] = [];

    elements.forEach((el) => {
      const id = el.id;
      const text = el.textContent || "";
      const level = parseInt(el.tagName[1], 10);

      // Skip the main title (first h1 in header)
      if (id && text) {
        extracted.push({ id, text, level });
      }
    });

    setHeadings(extracted);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open on Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent body scroll when modal is open and focus search input
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Focus search input when modal opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
      setSearchQuery(""); // Clear search when closing
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Filter headings based on search query
  const filteredHeadings = headings.filter((heading) =>
    heading.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close modal and optionally navigate to a heading
  const closeModal = useCallback((targetId?: string) => {
    // Blur the input first to prevent Safari focus issues
    searchInputRef.current?.blur();
    
    // Store current scroll position before closing
    const scrollY = window.scrollY;
    
    setIsOpen(false);
    
    if (targetId) {
      // Navigate to the target heading
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "instant", block: "start" });
          history.pushState(null, "", `#${targetId}`);
        }
      }, 50);
    } else {
      // Restore scroll position when just closing (not navigating)
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  }, []);

  if (headings.length === 0) return null;

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <kbd className="hidden rounded-md bg-neutral-800 px-2 py-1 font-mono text-xs text-neutral-300 shadow-sm sm:block dark:bg-neutral-200 dark:text-neutral-700">
          ⌘K
        </kbd>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition-all hover:scale-105 hover:bg-neutral-800 active:scale-95 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          aria-label="Open table of contents"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => closeModal()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
              closeModal();
            }
          }}
        >
          {/* Modal content */}
          <div
            className="relative my-8 w-full max-w-2xl rounded-xl bg-white p-4 shadow-2xl dark:bg-neutral-900 sm:my-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                    closeModal();
                  }
                }}
                placeholder="Search this manual..."
                className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-500 outline-none transition-colors focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:placeholder-neutral-400 dark:focus:border-neutral-500 dark:focus:bg-neutral-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  aria-label="Clear search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
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

            {/* Navigation list with scroll masks */}
            <div className="relative mt-4">
              {/* Top scrim */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 bg-gradient-to-b from-white to-transparent dark:from-neutral-900" />
              {/* Bottom scrim */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 bg-gradient-to-t from-white to-transparent dark:from-neutral-900" />
              
              <nav className="max-h-[60vh] overflow-y-auto py-3">
                {filteredHeadings.length === 0 ? (
                  <p className="py-8 text-center text-sm text-neutral-500">
                    No sections found matching &ldquo;{searchQuery}&rdquo;
                  </p>
                ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredHeadings.map((heading) => (
                    <li key={heading.id}>
                      <button
                        onClick={() => closeModal(heading.id)}
                        className="w-full px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                        style={{
                          paddingLeft: `${(heading.level - 1) * 16 + 12}px`,
                        }}
                      >
                        <span
                          className={`${
                            heading.level === 1
                              ? "font-semibold text-neutral-900 dark:text-white"
                              : heading.level === 2
                              ? "font-medium text-neutral-700 dark:text-neutral-200"
                              : "text-neutral-500 dark:text-neutral-400"
                          }`}
                        >
                          {heading.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                )}
              </nav>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

