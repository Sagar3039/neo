// ── Home Page Layout Utilities ────────────────────────────────────────────────
// Shared between SettingsPage (editing) and HomePage (reading).

import { storage } from "./storage";

export const HOME_ROWS = [
  { id: "top10", label: "Top 10 Today" },
  { id: "continue", label: "Continue Watching" },
  { id: "trendingMovies", label: "Trending Movies" },
  { id: "popularTV", label: "Popular TV Shows" },
  { id: "trendingAnime", label: "Trending Anime" },
  { id: "browseTrending", label: "Browse Trending (Tabs)" },
  { id: "topRated", label: "Top Rated Movies" },
  { id: "newReleases", label: "New Releases" },
  { id: "recommended", label: "Recommended for You" },
  { id: "genreGrid", label: "Browse by Genre" },
];

const DEFAULT_ROW_ORDER = HOME_ROWS.map((r) => r.id);
const DEFAULT_ROW_VISIBLE = Object.fromEntries(
  HOME_ROWS.map((r) => [r.id, true]),
);

export function loadHomeLayout() {
  const savedOrder = storage.get("homeRowOrder");
  const savedVisible = storage.get("homeRowVisible");
  const knownIds = new Set(HOME_ROWS.map((r) => r.id));

  const order = savedOrder
    ? [
        ...savedOrder.filter((id) => knownIds.has(id)),
        ...DEFAULT_ROW_ORDER.filter((id) => !savedOrder.includes(id)),
      ]
    : DEFAULT_ROW_ORDER;

  const visible = savedVisible
    ? { ...DEFAULT_ROW_VISIBLE, ...savedVisible }
    : DEFAULT_ROW_VISIBLE;

  return { order, visible };
}

export function saveHomeLayout(order, visible) {
  storage.set("homeRowOrder", order);
  storage.set("homeRowVisible", visible);
}

/** "carousel" (default) | "list" */
export function loadHomeViewMode() {
  return storage.get("homeViewMode") || "carousel";
}

export function saveHomeViewMode(mode) {
  storage.set("homeViewMode", mode);
}

export function loadStartPage() {
  return storage.get("startPage") || "home";
}
