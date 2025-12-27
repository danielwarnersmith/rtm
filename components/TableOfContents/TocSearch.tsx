"use client";

import { forwardRef } from "react";
import type { TocEntry } from "./useTocEntries";

type MenuMode = "toc" | "svg";

interface TocSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  selectedSection: TocEntry | null;
  menuMode: MenuMode;
  onGoBack: () => void;
}

/**
 * Search input component for TOC modal.
 */
export const TocSearch = forwardRef<HTMLInputElement, TocSearchProps>(
  ({ searchQuery, onSearchChange, onKeyDown, selectedSection, menuMode, onGoBack }, ref) => {
    return (
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 dark:border-neutral-800">
        {(selectedSection || menuMode === "svg") && (
          <button
            onClick={onGoBack}
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
          ref={ref}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onKeyDown}
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
    );
  }
);

TocSearch.displayName = "TocSearch";

