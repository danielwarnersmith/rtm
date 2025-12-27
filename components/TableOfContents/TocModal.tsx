"use client";

import { useRef, useEffect } from "react";
import type { TocEntry } from "./useTocEntries";
import { TocSearch } from "./TocSearch";

type MenuMode = "toc" | "svg";

interface TocModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSection: TocEntry | null;
  menuMode: MenuMode;
  selectedIndex: number;
  items: TocEntry[];
  onGoBack: () => void;
  onSelect: (item: TocEntry) => void;
  getChildren: (section: TocEntry) => TocEntry[];
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onItemHover: (index: number) => void;
}

/**
 * Modal component for table of contents navigation.
 */
export function TocModal({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  selectedSection,
  menuMode,
  selectedIndex,
  items,
  onGoBack,
  onSelect,
  getChildren,
  onKeyDown,
  onItemHover,
}: TocModalProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && items.length > 0) {
      const selectedEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, items.length]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search */}
        <TocSearch
          ref={searchInputRef}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onKeyDown={onKeyDown}
          selectedSection={selectedSection}
          menuMode={menuMode}
          onGoBack={onGoBack}
        />

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
                      onClick={() => onSelect(item)}
                      onMouseEnter={() => onItemHover(index)}
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
  );
}

