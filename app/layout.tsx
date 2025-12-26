import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HeaderProvider } from "@/components/HeaderContext";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RTM Documentation",
    template: "%s | RTM",
  },
  description: "Elektron machine manuals",
};

export const viewport: Viewport = {
  viewportFit: "cover",
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
    <html lang="en" suppressHydrationWarning className="bg-white dark:bg-neutral-950 overflow-x-hidden">
      <body className="min-h-screen bg-white dark:bg-neutral-950 overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <HeaderProvider>
            <Header />

            {/* Main Content */}
            <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col items-center w-full overflow-x-hidden">
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
          </HeaderProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
