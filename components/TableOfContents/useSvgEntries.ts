import { useMemo, useEffect, useState } from "react";
import { REGEX_PATTERNS } from "@/components/mdx/utils";

export interface SvgEntry {
  id: string;
  filename: string;
  element: HTMLElement;
}

/**
 * Hook to extract SVG entries from the page (dev mode only).
 */
export function useSvgEntries(): SvgEntry[] {
  const isDev = process.env.NODE_ENV === "development";
  const [svgEntries, setSvgEntries] = useState<SvgEntry[]>([]);
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

  const extractedSvgEntries = useMemo(() => {
    if (!isDev || !articleElement) return [];

    // Find all SVG elements directly or in containers from CustomImg
    const svgElements = Array.from(articleElement.querySelectorAll("svg"));
    const svgContainers = new Set<HTMLElement>();

    svgElements.forEach((svg) => {
      // Find the parent container (usually a span or div from CustomImg)
      let container: HTMLElement | null = svg.parentElement;
      // Walk up to find the actual container (span or div, skip nested elements)
      while (
        container &&
        container.tagName !== "SPAN" &&
        container.tagName !== "DIV" &&
        container !== articleElement
      ) {
        container = container.parentElement;
      }
      // Use the container if it's a valid span or div (not article)
      if (
        container &&
        container !== articleElement &&
        (container.tagName === "SPAN" || container.tagName === "DIV")
      ) {
        svgContainers.add(container);
      } else if (svg.parentElement && svg.parentElement !== articleElement) {
        // Fallback: use the direct parent if it's not the article
        svgContainers.add(svg.parentElement as HTMLElement);
      }
    });

    // Also check for img elements with .svg src (fallback case)
    const svgImages = Array.from(
      articleElement.querySelectorAll("img[src$='.svg']")
    );
    svgImages.forEach((img) => {
      let container: HTMLElement | null = img.parentElement;
      while (
        container &&
        container.tagName !== "SPAN" &&
        container.tagName !== "DIV" &&
        container !== articleElement
      ) {
        container = container.parentElement;
      }
      if (
        container &&
        container !== articleElement &&
        (container.tagName === "SPAN" || container.tagName === "DIV")
      ) {
        svgContainers.add(container);
      }
    });

    const svgs: SvgEntry[] = [];
    Array.from(svgContainers).forEach((container, index) => {
      // Try to get filename from SVG or img src
      const svg = container.querySelector("svg");
      const img = container.querySelector("img");
      let filename = `SVG ${index + 1}`;

      if (img && img.src) {
        try {
          const url = new URL(img.src);
          const pathParts = url.pathname.split("/");
          filename = pathParts[pathParts.length - 1] || filename;
        } catch {
          // If URL parsing fails, try extracting from src string
          const parts = img.src.split("/");
          filename = parts[parts.length - 1] || filename;
        }
      } else if (svg) {
        // For inline SVGs, try to extract from preceding heading or text
        let prevSibling: Element | null = container.previousElementSibling;
        let attempts = 0;
        while (prevSibling && attempts < 5) {
          if (REGEX_PATTERNS.HEADING_TAG.test(prevSibling.tagName)) {
            const headingText = prevSibling.textContent?.trim().substring(0, 40);
            if (headingText) {
              filename = `${headingText}...`;
              break;
            }
          }
          prevSibling = prevSibling.previousElementSibling;
          attempts++;
        }
      }

      // Create a unique ID for this SVG
      const id = `svg-${index}`;
      if (!container.id) {
        container.id = id;
      }
      svgs.push({
        id: container.id || id,
        filename,
        element: container,
      });
    });

    return svgs;
  }, [isDev, articleElement]);

  // Update state when extracted data changes (with delay for SVG to allow rendering)
  useEffect(() => {
    if (!isDev) {
      setSvgEntries([]);
    } else {
      const timeout = setTimeout(() => {
        setSvgEntries(extractedSvgEntries);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [isDev, extractedSvgEntries]);

  return svgEntries;
}

