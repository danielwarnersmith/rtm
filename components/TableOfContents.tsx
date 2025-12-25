"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface TocEntry {
  id: string;
  text: string;
  level: number; // 1 = main section (1., 2., etc), 2 = subsection (1.1, 2.1), 3 = sub-subsection (1.1.1)
}

interface SvgEntry {
  id: string;
  filename: string;
  element: HTMLElement;
}

type MenuMode = "toc" | "svg";

export function TableOfContents() {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<TocEntry[]>([]);
  const [svgEntries, setSvgEntries] = useState<SvgEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<TocEntry | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuMode, setMenuMode] = useState<MenuMode>("toc");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const isDev = process.env.NODE_ENV === "development";

  // Extract SVG entries from the page (dev mode only)
  useEffect(() => {
    if (!isDev) {
      setSvgEntries([]);
      return;
    }

    // Wait a bit for content to render
    const timeout = setTimeout(() => {
      const article = document.querySelector("article");
      if (!article) {
        setSvgEntries([]);
        return;
      }

      // Find all SVG elements directly or in containers from CustomImg
      const svgElements = Array.from(article.querySelectorAll("svg"));
      const svgContainers = new Set<HTMLElement>();

      svgElements.forEach((svg) => {
        // Find the parent container (usually a span or div from CustomImg)
        let container: HTMLElement | null = svg.parentElement;
        // Walk up to find the actual container (span or div, skip nested elements)
        while (
          container &&
          container.tagName !== "SPAN" &&
          container.tagName !== "DIV" &&
          container !== article
        ) {
          container = container.parentElement;
        }
        // Use the container if it's a valid span or div (not article)
        if (
          container &&
          container !== article &&
          (container.tagName === "SPAN" || container.tagName === "DIV")
        ) {
          svgContainers.add(container);
        } else if (svg.parentElement && svg.parentElement !== article) {
          // Fallback: use the direct parent if it's not the article
          svgContainers.add(svg.parentElement as HTMLElement);
        }
      });

      // Also check for img elements with .svg src (fallback case)
      const svgImages = Array.from(
        article.querySelectorAll("img[src$='.svg']")
      );
      svgImages.forEach((img) => {
        let container: HTMLElement | null = img.parentElement;
        while (
          container &&
          container.tagName !== "SPAN" &&
          container.tagName !== "DIV" &&
          container !== article
        ) {
          container = container.parentElement;
        }
        if (
          container &&
          container !== article &&
          (container.tagName === "SPAN" || container.tagName === "DIV")
        ) {
          svgContainers.add(container);
        }
      });

      const svgs: SvgEntry[] = [];
      Array.from(svgContainers).forEach((container, index) => {
        // Try to get filename from SVG or img src
        const svg = container.querySelector("svg");
        const img = container.querySelector("img");
        let filename = `SVG ${index + 1}`;

        if (img && img.src) {
          try {
            const url = new URL(img.src);
            const pathParts = url.pathname.split("/");
            filename = pathParts[pathParts.length - 1] || filename;
          } catch {
            // If URL parsing fails, try extracting from src string
            const parts = img.src.split("/");
            filename = parts[parts.length - 1] || filename;
          }
        } else if (svg) {
          // For inline SVGs, try to extract from preceding heading or text
          let prevSibling: Element | null = container.previousElementSibling;
          let attempts = 0;
          while (prevSibling && attempts < 5) {
            if (prevSibling.tagName.match(/^H[1-6]$/)) {
              const headingText = prevSibling.textContent?.trim().substring(0, 40);
              if (headingText) {
                filename = `${headingText}...`;
                break;
              }
            }
            prevSibling = prevSibling.previousElementSibling;
            attempts++;
          }
        }

        // Create a unique ID for this SVG
        const id = `svg-${index}`;
        if (!container.id) {
          container.id = id;
        }
        svgs.push({
          id: container.id || id,
          filename,
          element: container,
        });
      });

      setSvgEntries(svgs);
    }, 100);

    return () => clearTimeout(timeout);
  }, [isDev]);

  // Extract TOC entries from the page
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    // Find the TABLE OF CONTENTS section
    const tocHeading = Array.from(article.querySelectorAll("h1, h2")).find(
      (el) => el.textContent?.includes("TABLE OF CONTENTS")
    );

    if (!tocHeading) {
      // Fallback to extracting all headings if no TOC table found
      const elements = article.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
      const extracted: TocEntry[] = [];
      elements.forEach((el) => {
        const id = el.id;
        const text = el.textContent || "";
        const level = parseInt(el.tagName[1], 10);
        if (id && text && !text.includes("TABLE OF CONTENTS")) {
          extracted.push({ id, text, level });
        }
      });
      setEntries(extracted);
      return;
    }

    // Find the table after the TOC heading
    let tocTable: HTMLTableElement | null = null;
    let sibling = tocHeading.nextElementSibling;
    while (sibling) {
      if (sibling.tagName === "DIV" && sibling.querySelector("table")) {
        tocTable = sibling.querySelector("table");
        break;
      }
      if (sibling.tagName === "TABLE") {
        tocTable = sibling as HTMLTableElement;
        break;
      }
      // Stop if we hit another heading
      if (sibling.tagName.match(/^H[1-6]$/)) break;
      sibling = sibling.nextElementSibling;
    }

    if (!tocTable) {
      setEntries([]);
      return;
    }

    // Extract entries from the table
    const extracted: TocEntry[] = [];
    const rows = tocTable.querySelectorAll("tr");
    
    rows.forEach((row) => {
      const firstCell = row.querySelector("td:first-child");
      if (!firstCell) return;

      const link = firstCell.querySelector("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      const id = href.slice(1);
      const text = link.textContent?.trim() || "";
      
      // Determine level based on section number pattern
      // "1." = level 1, "1.1" = level 2, "1.1.1" = level 3
      const sectionMatch = text.match(/^(\d+(?:\.\d+)*)/);
      let level = 1;
      if (sectionMatch) {
        const parts = sectionMatch[1].split(".");
        level = parts.length;
      }

      if (id && text) {
        extracted.push({ id, text, level });
      }
    });

    setEntries(extracted);
  }, []);

  // Get main sections (level 1)
  const mainSections = useMemo(
    () => entries.filter((e) => e.level === 1),
    [entries]
  );

  // Get children of a section
  const getChildren = useCallback(
    (section: TocEntry) => {
      const idx = entries.findIndex((e) => e.id === section.id);
      if (idx === -1) return [];

      const children: TocEntry[] = [];
      for (let i = idx + 1; i < entries.length; i++) {
        if (entries[i].level <= section.level) break;
        children.push(entries[i]);
      }
      return children;
    },
    [entries]
  );

  // What to display
  const items = useMemo(() => {
    // SVG mode
    if (menuMode === "svg") {
      const filtered = searchQuery
        ? svgEntries.filter((e) =>
            e.filename.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : svgEntries;
      return filtered.map((e) => ({
        id: e.id,
        text: e.filename,
        level: 1,
      }));
    }

    // TOC mode
    if (selectedSection) {
      const children = getChildren(selectedSection);
      const filtered = searchQuery
        ? children.filter((e) =>
            e.text.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : children;
      return filtered;
    }

    // Show main sections or search all entries
    if (searchQuery) {
      const matchingEntries = entries.filter((e) =>
        e.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // In dev mode, also include matching SVG entries in search results
      if (isDev && svgEntries.length > 0) {
        const matchingSvgs = svgEntries
          .filter((e) =>
            e.filename.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map((e) => ({
            id: e.id,
            text: e.filename,
            level: 1,
          }));
        
        // If there are matching SVGs, add them to results
        if (matchingSvgs.length > 0) {
          return [...matchingEntries, ...matchingSvgs];
        }
      }
      
      return matchingEntries;
    }

    // Add SVG entry to main sections if in dev mode
    const sections = [...mainSections];
    if (isDev && svgEntries.length > 0) {
      sections.push({
        id: "svg-menu",
        text: `SVG Images (${svgEntries.length})`,
        level: 1,
      });
    }

    return sections;
  }, [
    menuMode,
    selectedSection,
    searchQuery,
    mainSections,
    entries,
    getChildren,
    svgEntries,
    isDev,
  ]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && items.length > 0) {
      const selectedEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, items.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Modal open/close effects
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
      setSearchQuery("");
      setSelectedSection(null);
      setSelectedIndex(0);
      setMenuMode("toc");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Navigate to entry
  const navigateTo = useCallback(
    (id: string) => {
      searchInputRef.current?.blur();
      setIsOpen(false);

      setTimeout(() => {
        // Check if this is an SVG entry (works in both SVG mode and TOC mode search)
        const svgEntry = svgEntries.find((e) => e.id === id);
        if (svgEntry) {
          // Calculate offset for sticky header
          // Header is h-16 (64px) + safe area inset + some padding
          // Using a larger offset (120px) to ensure SVG is well visible below header
          const headerOffset = 120;
          const elementTop = svgEntry.element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementTop - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });

          // Highlight briefly
          svgEntry.element.style.outline = "2px solid rgb(59 130 246)";
          svgEntry.element.style.outlineOffset = "4px";
          setTimeout(() => {
            svgEntry.element.style.outline = "";
            svgEntry.element.style.outlineOffset = "";
          }, 2000);
        } else {
          // Regular TOC entry
          document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
          history.pushState(null, "", `#${id}`);
        }
      }, 50);
    },
    [menuMode, svgEntries]
  );

  // Go back to top level
  const goBack = useCallback(() => {
    setSelectedSection(null);
    setSearchQuery("");
    setSelectedIndex(0);
    setMenuMode("toc");
    // Keep focus on input
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  // Handle item selection
  const handleSelect = useCallback(
    (item: TocEntry) => {
      // Special handling for SVG menu entry
      if (item.id === "svg-menu" && menuMode === "toc") {
        setMenuMode("svg");
        setSearchQuery("");
        setSelectedIndex(0);
        setTimeout(() => searchInputRef.current?.focus(), 0);
        return;
      }

      // Check if this is an SVG item (from search results in TOC mode)
      if (isDev && menuMode === "toc" && svgEntries.some((e) => e.id === item.id)) {
        navigateTo(item.id);
        return;
      }

      // TOC mode: check for children
      if (menuMode === "toc") {
        const hasChildren = !selectedSection && getChildren(item).length > 0;
        if (hasChildren) {
          setSelectedSection(item);
          setSearchQuery("");
          setSelectedIndex(0);
          // Keep focus on input
          setTimeout(() => searchInputRef.current?.focus(), 0);
          return;
        }
      }

      // Navigate to the item
      navigateTo(item.id);
    },
    [selectedSection, getChildren, navigateTo, menuMode, isDev, svgEntries]
  );

  // Keyboard navigation within modal
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
      if (
        (e.key === "Backspace" || e.key === "ArrowLeft") &&
        !searchQuery &&
        (selectedSection || menuMode === "svg")
      ) {
        goBack();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && items.length > 0) {
        e.preventDefault();
        handleSelect(items[selectedIndex]);
      }
    },
    [
      searchQuery,
      selectedSection,
      menuMode,
      goBack,
      items,
      selectedIndex,
      handleSelect,
      setIsOpen,
    ]
  );

  // Don't render if no entries and not in dev mode with SVGs
  if (entries.length === 0 && (!isDev || svgEntries.length === 0)) return null;

  return (
    <>
      {/* Trigger */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <kbd className="hidden rounded bg-neutral-800 px-2 py-1 font-mono text-xs text-neutral-300 sm:block dark:bg-neutral-200 dark:text-neutral-700">
          ⌘K
        </kbd>
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg hover:bg-neutral-800 active:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 dark:active:bg-neutral-100"
          aria-label="Open table of contents"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
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

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search */}
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
              {(selectedSection || menuMode === "svg") && (
                <button
                  onClick={goBack}
                  className="flex max-w-[200px] items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700 transition-colors hover:bg-neutral-200 active:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:active:bg-neutral-700"
                >
                  <span className="truncate">
                    {menuMode === "svg"
                      ? "SVG Images"
                      : selectedSection?.text}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={
                  menuMode === "svg"
                    ? "Filter SVGs..."
                    : selectedSection
                      ? "Filter..."
                      : "Jump to section..."
                }
                className="min-w-0 flex-1 bg-transparent py-4 pl-[7px] text-base text-neutral-900 outline-none placeholder:text-neutral-400 sm:text-sm dark:text-white"
              />
              <kbd className="hidden flex-shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-500 shadow-none sm:block dark:bg-neutral-800 dark:text-neutral-400">
                esc
              </kbd>
            </div>

            {/* List */}
            <div className="relative">
              <ul ref={listRef} className="max-h-[60vh] overflow-y-auto pb-[93px]">
              {items.length === 0 ? (
                <li className="py-8 text-center text-sm text-neutral-500">
                  No results
                </li>
              ) : (
                items.map((item, index) => {
                  const hasChildren =
                    menuMode === "toc" &&
                    !selectedSection &&
                    item.id !== "svg-menu" &&
                    getChildren(item).length > 0;
                  const isSelected = index === selectedIndex;

                  return (
                    <li key={item.id} data-index={index}>
                      <button
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`flex w-full items-center justify-between py-2.5 pl-[23px] pr-4 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                            : "text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        <span className="truncate">{item.text}</span>
                        {menuMode === "svg" && (
                          <svg
                            className="ml-2 mr-1 h-[15px] w-[15px] flex-shrink-0 text-neutral-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="9" x2="15" y2="9" />
                            <line x1="9" y1="15" x2="15" y2="15" />
                          </svg>
                        )}
                        {hasChildren && (
                          <svg
                            className="ml-2 mr-1 h-[15px] w-[15px] flex-shrink-0 text-neutral-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })
              )}
              </ul>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white from-[40px] via-white/50 via-65% to-transparent dark:from-neutral-900 dark:via-neutral-900/50" />
            </div>

            {/* Footer hint */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex h-[53px] items-center px-4">
              <div className="flex w-full items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <div className="hidden items-center gap-3 sm:flex">
                  {selectedSection && (
                    <span className="flex items-center gap-1">
                      <kbd className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 font-mono shadow-none dark:bg-neutral-800">
                        ←
                      </kbd>
                      <span>Back</span>
                    </span>
                  )}
                  {items.length > 1 && (
                    <span className="flex items-center gap-1">
                      <kbd className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 font-mono shadow-none dark:bg-neutral-800">
                        ↑
                      </kbd>
                      <kbd className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 font-mono shadow-none dark:bg-neutral-800">
                        ↓
                      </kbd>
                      <span>Navigate</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <kbd className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 font-mono shadow-none dark:bg-neutral-800">
                      ↵
                    </kbd>
                    <span>Select</span>
                  </span>
                </div>
                <span className="ml-auto pr-1.5">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
