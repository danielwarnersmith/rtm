import { formatMachineDate } from "@/lib/utils";
import { Tag } from "@/components/Tag";

interface MachineMetadataProps {
  date?: string;
  tags?: string[];
  className?: string;
  /** Layout style: "horizontal" (side by side) or "vertical" (stacked) */
  layout?: "horizontal" | "vertical";
}

/**
 * Component to display machine metadata (date and tags).
 */
export function MachineMetadata({ 
  date, 
  tags, 
  className = "",
  layout = "horizontal"
}: MachineMetadataProps) {
  if (!date && (!tags || tags.length === 0)) {
    return null;
  }

  if (layout === "vertical") {
    return (
      <div className={className}>
        {tags && tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        {date && (
          <time className="mt-3 block text-xs text-neutral-500 dark:text-neutral-500">
            {formatMachineDate(date)}
          </time>
        )}
      </div>
    );
  }

  return (
    <div className={`mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-500 ${className}`}>
      {date && (
        <time>
          {formatMachineDate(date)}
        </time>
      )}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      )}
    </div>
  );
}

