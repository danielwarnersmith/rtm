import { useEffect, useRef } from "react";

/**
 * Hook to handle keyboard shortcuts.
 * 
 * @param key - The key to listen for (e.g., "k", "Escape")
 * @param callback - Function to call when shortcut is pressed
 * @param options - Optional configuration
 */
export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    preventDefault?: boolean;
  } = {}
) {
  const callbackRef = useRef(callback);
  const optionsRef = useRef(options);

  // Keep callback and options refs up to date
  useEffect(() => {
    callbackRef.current = callback;
    optionsRef.current = options;
  }, [callback, options]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the key matches (case-insensitive for letter keys)
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      // Check modifier keys using refs to avoid dependency issues
      const opts = optionsRef.current;
      const hasCtrlOrCmd = e.ctrlKey || e.metaKey;
      const ctrlMatch = opts.ctrlKey === undefined ? true : (opts.ctrlKey ? hasCtrlOrCmd : !hasCtrlOrCmd);
      const metaMatch = opts.metaKey === undefined ? true : e.metaKey === opts.metaKey;
      const shiftMatch = opts.shiftKey === undefined ? true : e.shiftKey === opts.shiftKey;
      const altMatch = opts.altKey === undefined ? true : e.altKey === opts.altKey;

      if (ctrlMatch && metaMatch && shiftMatch && altMatch) {
        if (opts.preventDefault !== false) {
          e.preventDefault();
        }
        callbackRef.current(e);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [key]); // Only depend on key, use refs for callback and options
}

/**
 * Convenience hook for Cmd/Ctrl+K shortcut.
 * 
 * @param callback - Function to call when Cmd/Ctrl+K is pressed
 */
export function useCmdK(callback: () => void) {
  useKeyboardShortcut("k", callback, {
    ctrlKey: true, // Accepts both Ctrl and Cmd (metaKey)
    preventDefault: true,
  });
}

