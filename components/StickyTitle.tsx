"use client";

import { useEffect, useRef, useCallback } from "react";
import { useHeader } from "./HeaderContext";

interface StickyTitleProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Wrapper component that observes when its children scroll out of view
 * and updates the header title accordingly.
 */
export function StickyTitle({ title, children }: StickyTitleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { setTitle } = useHeader();

  // Memoize the callback to avoid recreating observer on every render
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      // Show title in header when the element is scrolled out of view
      setTitle(entry.isIntersecting ? "" : title);
    },
    [title, setTitle]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create observer with memoized callback
    const observer = new IntersectionObserver(handleIntersection, {
      // Trigger when the element leaves the top of the viewport
      // Account for the sticky header height (~64px + safe area)
      rootMargin: "-80px 0px 0px 0px",
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
      // Clear title when component unmounts
      setTitle("");
    };
  }, [handleIntersection, setTitle]);

  return <div ref={ref}>{children}</div>;
}

