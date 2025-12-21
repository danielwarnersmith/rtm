import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RTM Documentation",
    template: "%s | RTM",
  },
  description: "A modern, content-driven documentation site built with Next.js and MDX",
};

/**
 * Root layout component with navigation header.
 * Provides consistent navigation across all pages.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white dark:bg-neutral-950">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/80">
          <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Logo / Site Title */}
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white"
            >
              RTM
            </Link>

            {/* Navigation Links */}
            <ul className="flex items-center gap-6">
              <li>
                <Link
                  href="/"
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/machines/getting-started"
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Machines
                </Link>
              </li>
              <li>
                <Link
                  href="/search"
                  className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Search
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              Status: Work in progress
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

