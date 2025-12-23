"use client";

import Link from "next/link";
import { useHeader } from "./HeaderContext";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Navigation header with optional sticky title display.
 * Shows machine name when scrolled past the page title.
 */
export function Header() {
  const { title } = useHeader();

  return (
    <>
      {/* Safe area background - extends header color under Dynamic Island */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-white transition-colors duration-200 dark:bg-neutral-950"
        style={{ height: "env(safe-area-inset-top)" }}
      />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white pt-[env(safe-area-inset-top)] transition-colors duration-200 dark:border-neutral-800 dark:bg-neutral-950">
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
            <div
              className={`flex items-center overflow-hidden transition-all duration-300 ease-out ${
                title ? "max-w-[300px] opacity-100" : "max-w-0 opacity-0"
              }`}
            >
              <span className="mx-2 text-neutral-300 dark:text-neutral-600">/</span>
              <span className="whitespace-nowrap text-sm font-medium text-neutral-600 dark:text-neutral-400">
                {title}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="flex items-center gap-6">
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </nav>
      </header>
    </>
  );
}

