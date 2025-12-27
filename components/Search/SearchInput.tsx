"use client";

import { forwardRef } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
  isPagefindLoaded: boolean;
  error: string | null;
  disabled?: boolean;
}

/**
 * Search input component with loading indicator and clear button.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, isLoading, isPagefindLoaded, error, disabled }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onChange("");
        e.currentTarget.blur();
      }
      if (e.key === "Enter") {
        e.currentTarget.blur();
      }
    };

    return (
      <div className="relative">
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 pr-12 text-neutral-900 placeholder-neutral-500 shadow-sm transition-colors focus:border-neutral-900 focus:outline-none focus:ring-0 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder-neutral-400 dark:focus:border-white"
          disabled={disabled ?? (!isPagefindLoaded && !error)}
        />
        {isLoading ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          </div>
        ) : value && (
          <button
            onClick={() => onChange("")}
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
    );
  }
);

SearchInput.displayName = "SearchInput";

