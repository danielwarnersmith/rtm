"use client";

import { useState, useEffect } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { withBasePath } from "@/lib/basePath";

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
    if (!isSvg) return;

    // Reset state when imageSrc changes
    setSvgContent(null);
    setSvgError(false);

    fetch(imageSrc as string)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch SVG: ${res.status} ${res.statusText} - ${imageSrc}`);
        }
        return res.text();
      })
      .then((text) => {
        if (text.trim().startsWith("<svg")) {
          setSvgContent(text);
          setSvgError(false);
        } else {
          throw new Error("Response is not a valid SVG");
        }
      })
      .catch((err) => {
        console.error("[CustomImg] Failed to load SVG:", err, "Source:", imageSrc);
        setSvgError(true);
      });
  }, [imageSrc, isSvg]);

  // For SVG files that have loaded successfully, render inline to support CSS variables
  if (isSvg && svgContent && !svgError) {
    // Transform CSS variables to use hsl() wrapper for proper color rendering
    // The --foreground variable contains HSL values like "0 0% 98%" but SVG attributes need "hsl(0 0% 98%)"
    // Handle fill and stroke attributes with various quote styles
    let styledSvg = svgContent.replace(
      /(fill|stroke)="var\(--foreground\)"/gi,
      '$1="hsl(var(--foreground))"'
    );
    styledSvg = styledSvg.replace(
      /(fill|stroke)='var\(--foreground\)'/gi,
      "$1='hsl(var(--foreground))'"
    );
    styledSvg = styledSvg.replace(
      /(fill|stroke)=var\(--foreground\)/gi,
      '$1="hsl(var(--foreground))"'
    );

    // Inject styling into SVG to ensure proper rendering
    styledSvg = styledSvg.replace(
      /<svg([^>]*)>/i,
      (match, attrs) => {
        // Add class and style attributes if not present
        let newAttrs = attrs;
        if (!newAttrs.includes('class=') && !newAttrs.includes('className=')) {
          newAttrs += ' class="h-auto w-full max-w-full"';
        }
        
        if (!newAttrs.includes('style=')) {
          newAttrs += ' style="max-width: 100%; width: 100%; height: auto; display: block;"';
        }
        return `<svg${newAttrs}>`;
      }
    );

    return (
      <span
        className={[
          "my-6 flex justify-center overflow-hidden rounded-md border",
          "border-neutral-200 dark:border-neutral-800",
          "w-full max-w-full",
          isOledScreen ? "p-3" : "",
          typeof props.className === "string" ? props.className : "",
        ]
          .join(" ")
          .trim()}
        style={{ display: "block", width: "100%", maxWidth: "100%" }}
        dangerouslySetInnerHTML={{ __html: styledSvg }}
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
      className={[
        "my-6 h-auto max-w-full rounded-md",
        typeof props.className === "string" ? props.className : "",
      ].join(" ").trim()}
    />
  );
}

