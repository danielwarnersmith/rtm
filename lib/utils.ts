/**
 * Format a machine date string to a human-readable format.
 * 
 * @param date - Date string (ISO format or parseable date string)
 * @returns Formatted date string (e.g., "January 1, 2024")
 */
export function formatMachineDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

