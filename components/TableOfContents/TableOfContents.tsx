"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useCmdK } from "@/hooks/useKeyboardShortcut";
import { useTocEntries, type TocEntry } from "./useTocEntries";
import { useSvgEntries } from "./useSvgEntries";
import { TocModal } from "./TocModal";

type MenuMode = "toc" | "svg";

/**
 * Table of contents component with search and navigation.
 */
export function TableOfContents() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<TocEntry | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menuMode, setMenuMode] = useState<MenuMode>("toc");
  const scrollPositionRef = useRef<number>(0);
  
  const entries = useTocEntries();
  const svgEntries = useSvgEntries();
  const isDev = process.env.NODE_ENV === "development";
  
  // Debounce search query for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 150);

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

  // What to display - use debounced search query
  const items = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    
    // SVG mode
    if (menuMode === "svg") {
      const filtered = query
        ? svgEntries.filter((e) =>
            e.filename.toLowerCase().includes(query)
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
      const filtered = query
        ? children.filter((e) =>
            e.text.toLowerCase().includes(query)
          )
        : children;
      return filtered;
    }

    // Show main sections or search all entries
    if (query) {
      const matchingEntries = entries.filter((e) =>
        e.text.toLowerCase().includes(query)
      );
      
      // In dev mode, also include matching SVG entries in search results
      if (isDev && svgEntries.length > 0) {
        const matchingSvgs = svgEntries
          .filter((e) =>
            e.filename.toLowerCase().includes(query)
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
    debouncedSearchQuery,
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

  // Keyboard shortcuts and custom event listener
  const handleOpenTOC = useCallback(() => {
    // Store scroll position before opening (for Safari fix)
    scrollPositionRef.current = window.scrollY;
    setIsOpen(true);
  }, []);

  // Set up keyboard shortcut
  useCmdK(handleOpenTOC);

  // Set up custom event listener for "Contents" button
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const handleOpenTOCEvent = () => {
      setIsOpen(true);
    };
    
    window.addEventListener("openTOC", handleOpenTOCEvent);
    
    return () => {
      window.removeEventListener("openTOC", handleOpenTOCEvent);
    };
  }, []);

  // Modal open/close effects
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setSearchQuery("");
      setSelectedSection(null);
      setSelectedIndex(0);
      setMenuMode("toc");
      
      // Restore scroll position (fixes Safari bug where ESC scrolls to bottom)
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Navigate to entry
  const navigateTo = useCallback(
    (id: string) => {
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
    [svgEntries]
  );

  // Go back to top level
  const goBack = useCallback(() => {
    setSelectedSection(null);
    setSearchQuery("");
    setSelectedIndex(0);
    setMenuMode("toc");
  }, []);

  // Handle item selection
  const handleSelect = useCallback(
    (item: TocEntry) => {
      // Special handling for SVG menu entry
      if (item.id === "svg-menu" && menuMode === "toc") {
        setMenuMode("svg");
        setSearchQuery("");
        setSelectedIndex(0);
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
        e.stopPropagation();
        // Blur input to prevent Safari from trying to scroll to it
        if (e.currentTarget instanceof HTMLInputElement) {
          e.currentTarget.blur();
        }
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

  // Handle mouse hover to update selected index
  const handleItemHover = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Always render the modal (even if hidden) to ensure event listeners are set up
  // The modal will handle its own visibility based on isOpen state
  return (
    <TocModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedSection={selectedSection}
      menuMode={menuMode}
      selectedIndex={selectedIndex}
      items={items}
      onGoBack={goBack}
      onSelect={handleSelect}
      getChildren={getChildren}
      onKeyDown={handleInputKeyDown}
      onItemHover={handleItemHover}
    />
  );
}

