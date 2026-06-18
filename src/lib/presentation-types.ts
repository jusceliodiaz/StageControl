export const CATEGORIES = [
  "Fachada",
  "Rooftop",
  "Piscina",
  "Apartamentos",
  "Localização",
  "Implantação",
  "Áreas Comuns",
  "Institucional",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_DISPLAYS = ["left", "center", "right"] as const;
export type DisplaySlot = string;

export const DISPLAY_LABELS: Record<string, string> = {
  left: "Monitor Esquerda",
  center: "Monitor Central",
  right: "Monitor Direita",
};

export function displayLabel(id: string) {
  return DISPLAY_LABELS[id] ?? `Monitor ${id}`;
}

export interface MediaItem {
  id: string;
  title: string;
  category: string;
  cover_url: string | null;
  video_url: string | null;
  image_url: string | null;
  created_at: string;
}

export interface DisplayRow {
  id: string;
  current_media_id: string | null;
  updated_at: string;
  last_seen_at: string | null;
  ping_requested_at: string | null;
}

export interface SceneRow {
  id: string;
  name: string;
  assignments: Record<string, string | null>;
  created_at: string;
}

export const ONLINE_THRESHOLD_MS = 20_000;

export function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}
