import { useMemo, useState, useEffect } from "react";
import { REGEX_PATTERNS } from "@/components/mdx/utils";

export interface TocEntry {
  id: string;
  text: string;
  level: number; // 1 = main section (1., 2., etc), 2 = subsection (1.1, 2.1), 3 = sub-subsection (1.1.1)
}

/**
 * Hook to extract TOC entries from the page.
 */
export function useTocEntries(): TocEntry[] {
  const [articleElement, setArticleElement] = useState<HTMLElement | null>(null);

  // Re-check for article element on mount and after navigation
  useEffect(() => {
    if (typeof document === "undefined") return;
    
    const findArticle = () => {
      const article = document.querySelector("article");
      if (article) {
        setArticleElement(article);
      }
    };

    // Check immediately
    findArticle();

    // Also check after delays to handle client-side navigation
    const timeouts = [
      setTimeout(findArticle, 100),
      setTimeout(findArticle, 500),
      setTimeout(findArticle, 1000),
    ];

    // Watch for DOM changes (but disconnect after finding article)
    const observer = new MutationObserver(() => {
      findArticle();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, []);

  const extractedTocEntries = useMemo(() => {
    if (!articleElement) return [];

    // Find the TABLE OF CONTENTS section
    const headings = Array.from(articleElement.querySelectorAll("h1, h2"));
    const tocHeading = headings.find(
      (el) => el.textContent?.includes("TABLE OF CONTENTS")
    );

    if (!tocHeading) {
      // Fallback to extracting all headings if no TOC table found
      const elements = articleElement.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
      const extracted: TocEntry[] = [];
      elements.forEach((el) => {
        const id = el.id;
        const text = el.textContent || "";
        const level = parseInt(el.tagName[1], 10);
        if (id && text && !text.includes("TABLE OF CONTENTS")) {
          extracted.push({ id, text, level });
        }
      });
      return extracted;
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
      if (REGEX_PATTERNS.HEADING_TAG.test(sibling.tagName)) break;
      sibling = sibling.nextElementSibling;
    }

    if (!tocTable) {
      return [];
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
      const sectionMatch = text.match(REGEX_PATTERNS.SECTION_NUMBER);
      let level = 1;
      if (sectionMatch) {
        const parts = sectionMatch[1].split(".");
        level = parts.length;
      }

      if (id && text) {
        extracted.push({ id, text, level });
      }
    });

    return extracted;
  }, [articleElement]);

  return extractedTocEntries;
}

