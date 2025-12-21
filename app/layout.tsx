import type { Metadata } from "next";
import Link from "next/link";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white dark:bg-neutral-950">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
                  <ThemeToggle />
                </li>
              </ul>
            </nav>
          </header>

          {/* Main Content */}
          <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>

          {/* Footer */}
          <footer>
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                Status: Work in progress
              </p>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
