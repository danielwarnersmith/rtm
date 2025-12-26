"use client";

import { useState, useEffect, useMemo } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { withBasePath } from "@/lib/basePath";

// SVG content cache to avoid refetching the same SVGs
const svgCache = new Map<string, string>();

// Regex patterns for SVG transformation (extracted as constants)
const FOREGROUND_VAR_PATTERNS = [
  [/(fill|stroke)="var\(--foreground\)"/gi, '$1="hsl(var(--foreground))"'],
  [/(fill|stroke)='var\(--foreground\)'/gi, "$1='hsl(var(--foreground))'"],
  [/(fill|stroke)=var\(--foreground\)/gi, '$1="hsl(var(--foreground))"'],
] as const;

const SVG_TAG_PATTERN = /<svg([^>]*)>/i;

/**
 * Custom image component with lazy loading and base path support.
 * SVG files are rendered inline to support theme-aware CSS variables.
 */
export function CustomImg(props: ComponentPropsWithoutRef<"img">) {
  const { src, alt, ...rest } = props;
  const imageSrc = withBasePath(src);
  const isSvg = typeof src === "string" && src.toLowerCase().endsWith(".svg");
  const isOledScreen = typeof src === "string" && src.includes("/oled/");
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [svgError, setSvgError] = useState(false);

  useEffect(() => {
    if (!isSvg || !imageSrc) return;

    // Check cache first
    const cached = svgCache.get(imageSrc);
    if (cached) {
      setSvgContent(cached);
      setSvgError(false);
      return;
    }

    // Reset state when imageSrc changes
    setSvgContent(null);
    setSvgError(false);

    let cancelled = false;

    const srcString = imageSrc as string;
    fetch(srcString)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(`Failed to fetch SVG: ${res.status} ${res.statusText} - ${srcString}`);
        }
        return res.text();
      })
      .then((text) => {
        if (cancelled || !text) return;
        const trimmed = text.trim();
        if (trimmed.startsWith("<svg")) {
          // Cache the content
          svgCache.set(srcString, text);
          setSvgContent(text);
          setSvgError(false);
        } else {
          throw new Error("Response is not a valid SVG");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[CustomImg] Failed to load SVG:", err, "Source:", imageSrc);
        setSvgError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [imageSrc, isSvg]);

  // Memoize SVG transformation to avoid re-processing on every render
  const transformedSvg = useMemo(() => {
    if (!isSvg || !svgContent || svgError) return null;

    // Transform CSS variables to use hsl() wrapper for proper color rendering
    // The --foreground variable contains HSL values like "0 0% 98%" but SVG attributes need "hsl(0 0% 98%)"
    let styledSvg = svgContent;
    for (const [pattern, replacement] of FOREGROUND_VAR_PATTERNS) {
      styledSvg = styledSvg.replace(pattern, replacement);
    }

    // Inject styling into SVG to ensure proper rendering
    styledSvg = styledSvg.replace(SVG_TAG_PATTERN, (match, attrs) => {
      // Add class and style attributes if not present
      let newAttrs = attrs;
      if (!newAttrs.includes('class=') && !newAttrs.includes('className=')) {
        newAttrs += ' class="h-auto w-full max-w-full"';
      }
      
      if (!newAttrs.includes('style=')) {
        newAttrs += ' style="max-width: 100%; width: 100%; height: auto; display: block;"';
      }
      return `<svg${newAttrs}>`;
    });

    return styledSvg;
  }, [isSvg, svgContent, svgError]);

  // Memoize className construction
  const containerClassName = useMemo(() => {
    return [
      "my-6 flex justify-center overflow-hidden rounded-md border",
      "border-neutral-200 dark:border-neutral-800",
      "w-full max-w-full",
      isOledScreen ? "p-3" : "",
      typeof props.className === "string" ? props.className : "",
    ]
      .join(" ")
      .trim();
  }, [isOledScreen, props.className]);

  const imgClassName = useMemo(() => {
    return [
      "my-6 h-auto max-w-full rounded-md",
      typeof props.className === "string" ? props.className : "",
    ].join(" ").trim();
  }, [props.className]);

  // For SVG files that have loaded successfully, render inline to support CSS variables
  if (isSvg && transformedSvg) {
    return (
      <span
        className={containerClassName}
        style={{ display: "block", width: "100%", maxWidth: "100%" }}
        dangerouslySetInnerHTML={{ __html: transformedSvg }}
      />
    );
  }

  // For SVG files that failed, or non-SVG files, use regular img tag
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={imageSrc}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      className={imgClassName}
    />
  );
}

