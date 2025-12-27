/**
 * Sort machines by date (newest first), falling back to alphabetical by title.
 * 
 * @param machines - Array of machine documents
 * @returns Sorted array of machines
 */
export function sortMachinesByDate<T extends { date?: string; title: string }>(
  machines: T[]
): T[] {
  return [...machines].sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return a.title.localeCompare(b.title);
  });
}

