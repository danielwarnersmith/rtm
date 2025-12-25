/** API client for FastAPI backend. */

export interface Item {
  id: string;
  status: "ok" | "needs_review" | "rejected";
  confidence: number;
  source_url: string | null;
  preview_url: string | null;
  svg_url: string | null;
  updated_at: string;
}

export interface ItemState {
  version: string;
  source_path: string;
  updated_at: string;
  oled_bbox: number[] | null;
  normalize_params: {
    target_size: number[];
    otsu_threshold?: number;
  };
  validation: {
    is_qualifying: boolean;
    confidence: number;
    reason_codes: string[];
    pixel_density?: number;
  };
  overrides: {
    force_on: [number, number][];
    force_off: [number, number][];
  };
  flags: Record<string, any>;
  notes: string;
}

export interface ItemResponse {
  id: string;
  state: ItemState;
  source_url: string;
  preview_url: string | null;
  svg_url: string | null;
}

export interface ItemStateUpdate {
  oled_bbox?: number[];
  threshold?: number;
  overrides?: {
    force_on?: number[][];
    force_off?: number[][];
  };
  flags?: Record<string, any>;
  notes?: string;
  manual_status?: string; // "ok", "needs_review", "rejected", or "" to clear
}

export async function getDevice(): Promise<{ device: string }> {
  const response = await fetch("/api/device");
  if (!response.ok) {
    throw new Error(`Failed to get device: ${response.statusText}`);
  }
  return response.json();
}

export async function listItems(): Promise<Item[]> {
  const response = await fetch("/api/items");
  if (!response.ok) {
    throw new Error(`Failed to list items: ${response.statusText}`);
  }
  const data = await response.json();
  return data.items;
}

export async function getItem(itemId: string): Promise<ItemResponse> {
  const response = await fetch(`/api/item/${itemId}`);
  if (!response.ok) {
    throw new Error(`Failed to get item: ${response.statusText}`);
  }
  return response.json();
}

export async function updateItemState(
  itemId: string,
  update: ItemStateUpdate
): Promise<{ status: string; state: ItemState }> {
  const response = await fetch(`/api/item/${itemId}/state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    throw new Error(`Failed to update item state: ${response.statusText}`);
  }
  return response.json();
}

export async function rerunItem(
  itemId: string,
  refineBbox: boolean = false
): Promise<{
  status: string;
  svg_url: string | null;
  preview_url: string | null;
  state: ItemState;
}> {
  const response = await fetch(`/api/item/${itemId}/rerun?refine_bbox=${refineBbox}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to rerun item: ${response.statusText}`);
  }
  return response.json();
}

