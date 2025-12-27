"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { useHeader } from "./HeaderContext";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Navigation header with optional sticky title display.
 * Shows machine name when scrolled past the page title.
 */
function HeaderComponent() {
  const { title } = useHeader();

  // Memoize title container className
  const titleContainerClassName = useMemo(() => {
    return `flex items-center overflow-hidden transition-all duration-300 ease-out ${
      title ? "max-w-[300px] opacity-100" : "max-w-0 opacity-0"
    }`;
  }, [title]);

  return (
    <>
      {/* Navigation Header - using fixed positioning for reliable stickiness */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-neutral-200 bg-white pt-[env(safe-area-inset-top)] transition-colors duration-200 dark:border-neutral-800 dark:bg-neutral-950">
        <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo / Site Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white"
            >
              RTM
            </Link>
            
            {/* Animated title separator and text */}
            <div className={titleContainerClassName}>
              <span className="mx-2 text-neutral-300 dark:text-neutral-600">/</span>
              <span className="whitespace-nowrap text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {title}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="flex items-center gap-6">
            <li>
              <button
                onClick={() => {
                  // Dispatch custom event to trigger TOC modal
                  window.dispatchEvent(new CustomEvent('openTOC'));
                }}
                className="hidden items-center gap-2 rounded-md bg-neutral-100 px-3 py-1.5 text-left text-sm text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 sm:flex"
                aria-label="Open table of contents"
              >
                <span>Contents</span>
                <div className="flex items-center gap-1">
                  <kbd className="flex h-5 w-5 items-center justify-center rounded border border-neutral-300 font-mono text-xs font-medium leading-none text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="26"
                      height="26"
                      viewBox="0 0 23.5 23.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-2.5 w-2.5"
                    >
                      <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
                    </svg>
                  </kbd>
                  <kbd className="flex h-5 w-5 items-center justify-center rounded border border-neutral-300 font-mono text-[12px] font-weight-[100] leading-none text-neutral-400 dark:border-neutral-600 dark:text-neutral-500">
                    K
                  </kbd>
                </div>
              </button>
            </li>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </nav>
      </header>
      
      {/* Spacer to prevent content from going under fixed header */}
      <div style={{ height: `calc(4rem + env(safe-area-inset-top, 0px))` }} />
    </>
  );
}

export const Header = memo(HeaderComponent);

