# Sagar - Application Overview

This document explains how the app works, where it gets its data from, and how to modify key parts of the app.

## 1. High-Level Architecture

The app is an Electron desktop application with a React renderer built using Vite.

Key runtime layers:
- `index.js`: Electron main process startup, window creation, ad-blocking, IPC registration, web request interception, and helper process setup.
- `preload.js`: Electron preload script that exposes a safe `window.electron` bridge for renderer IPC.
- `src/main.jsx`: React app entry point.
- `src/App.jsx`: Root React component that controls navigation, startup, settings, API key management, trending fetch, and page rendering.
- `src/pages/*`: The main UI pages for Home, Movie, TV, Library, Downloads, Settings.
- `src/components/*`: Reusable UI components such as modals, cards, navbar, and player controls.
- `src/utils/*`: Utility modules for API access, storage, appearance, backups, subtitles, ratings, and updates.
- `src/ipc/*`: Electron IPC handlers for downloads, anime resolution, storage, subtitles, blocking stats, player controls, and more.

## 2. What Data the App Uses and Where It Comes From

### 2.1 TMDB (The Movie Database)

The app uses TMDB for metadata, search, homepage content, trending lists, images, trailers, and ratings.
- Code path: `src/utils/api.js` → `tmdbFetch(path, apiKey)`
- Base URL: `https://api.themoviedb.org/3`
- Image base: `https://image.tmdb.org/t/p`
- Metadata language is determined by local setting stored in `localStorage` as `streambert_tmdbLang`.

Common TMDB endpoints used in the app:
- `/trending/movie/week`
- `/trending/tv/week`
- `/movie/{id}`
- `/tv/{id}`
- `/movie/{id}/videos`
- `/movie/top_rated`
- `/tv/top_rated`
- `/movie/{id}/recommendations`
- `/tv/{id}/similar`
- `/tv/{id}/episode_group/{groupId}`
- `/movie/{id}/release_dates`
- `/tv/{id}/content_ratings`

### 2.2 AniList (Anime metadata)

When the app detects anime content, it uses AniList for extra metadata and season titles.
- Code path: `src/utils/api.js` → `fetchAnilistData(tmdbId, title)`
- API endpoint: `https://graphql.anilist.co`
- Cached in `localStorage` under `streambert_anilistCache`
- Cache TTL: 7 days

Anime is detected in `src/utils/api.js` via `isAnimeContent(item, details)` which returns true when:
- TMDB genre ID 16 is present AND
- Original language is `ja` OR origin country includes `JP`

### 2.3 Video playback sources

The app does not host video. It embeds streaming sources using web players.

Defined sources live in `src/utils/api.js` under `PLAYER_SOURCES`.

Current configured sources:
- `videasy` → `https://player.videasy.net/...`
- `vidsrc` → `https://vsembed.su/embed/...`
- `vidking` → `https://www.vidking.net/embed/...`
- `allmanga` → `https://allmanga.to` (anime only)

The current playback URL is built using `getSourceUrl(sourceId, type, id, season, ep, extraParams, accentColor, subtitleLang)`.

For anime, the default source is `allmanga`. For non-anime content, the default source is `vidking`.

### 2.4 AllManga / Anime streaming resolution

Anime playback uses a special resolver in `src/ipc/allmanga.js`.
- This code runs in the Electron main process and bypasses browser CORS and bot-check protections.
- It can decode encrypted AllManga responses, follow redirects, and extract `.mp4` sources.
- It may also use AniList season titles to build correct search queries for seasons.

Renderer calls:
- `window.electron.resolveAllManga(args)`
- `window.electron.setPlayerVideo(args)`

### 2.5 Downloading

Downloads are managed by the main process via `src/ipc/downloads.js`.
- A trusted downloader binary is validated using `check-downloader`.
- `runDownload` spawns the downloader binary via `child_process.spawn`.
- Download progress is sent back to the renderer with `download-progress` events.
- Download metadata is persisted in `downloads.json` inside Electron app data.
- Subtitle downloads may also be handled during the download process.

### 2.6 Subtitles and media interception

Electron intercepts media requests from player webviews and routes them to the renderer.
- `preload.js` exposes `onM3u8Found` and `onSubtitleFound`.
- `index.js` intercepts `.m3u8` and `.vtt` requests in `setupSession()` and sends them over IPC.
- This is how the app captures stream playlists and subtitle URLs.

## 3. App Startup and Main Flow

### 3.1 Electron main process

Entry point: `index.js`
- Creates the main `BrowserWindow`.
- Sets up ad blocking and web request interception.
- Registers IPC handlers from `src/ipc/*` modules.
- Applies session-level policies for the player and trailer webviews.

`preload.js` exposes safe renderer APIs with `contextBridge.exposeInMainWorld`.

### 3.2 React initialization

Entry point: `src/main.jsx`
- Renders `<App />` into the root DOM node.

Root logic: `src/App.jsx`
- Loads the TMDB API key from `window.electron.secureGet("apikey")` using the Electron secure store.
- Manages app state for the selected page, saved library items, user progress, watched state, trending content, update banners, and offline fallback.
- Applies theme and accent styles using `src/utils/appearance.js`.
- Fetches homepage trending content and caches it in `localStorage` as `trendingCache`.
- Handles setup mode if the TMDB API key is missing or invalid.
- Watches for metadata language changes and re-fetches TMDB data when needed.

## 4. Storage and Settings

### 4.1 Local storage

The app uses a small storage wrapper in `src/utils/storage.js`.
- `storage.get(key)` reads `localStorage` at `streambert_{key}`.
- `storage.set(key, value)` writes JSON to `localStorage` at `streambert_{key}`.
- `storage.remove(key)` deletes a key.
- `storage.clearAll()` clears all `streambert_` keys.

Common storage keys are defined in `STORAGE_KEYS`.
Examples:
- `START_PAGE` (`startPage`)
- `PLAYER_SOURCE` (`playerSource`)
- `WATCH_PROGRESS` (`progress`)
- `SAVED` (`saved`)
- `HISTORY` (`history`)
- `SUBTITLE_LANG` (`subtitleLang`)
- `TMDB_LANG` (`tmdbLang`)
- `ACCENT_COLOR` (`accentColor`)
- `THEME` (`theme`)
- `HOME_ROW_ORDER` and `HOME_ROW_VISIBLE`
- `EPISODE_RELEASE_CACHE` and `SOURCE_FAILOVER_CACHE`

### 4.2 Secure storage

Sensitive keys are stored with `secureStorage` in `src/utils/storage.js`.
This uses Electron's safe storage API when available:
- `secureStorage.get(key)`
- `secureStorage.set(key, value)`

Sensitive values stored securely:
- `STORAGE_KEYS.API_KEY` (`apikey`) for TMDB
- `STORAGE_KEYS.SUBDL_API_KEY` (`subdlApiKey`) for subtitle downloader services
- `STORAGE_KEYS.WYZIE_API_KEY` (`wyzieApiKey`)

## 5. How to Modify the App

### 5.1 Changing the metadata source

Most pages use `tmdbFetch()` in `src/utils/api.js`.
- To add or change metadata endpoints, update `tmdbFetch()` usage in pages like `src/pages/HomePage.jsx`, `src/pages/MoviePage.jsx`, `src/pages/TVPage.jsx`, and `src/pages/SettingsPage.jsx`.
- If you want a different metadata provider, replace `tmdbFetch()` calls with a new fetch helper and update the page data shapes.

### 5.2 Changing player sources

The list of embedded player sources lives in `src/utils/api.js`.
- Add a new source object to `PLAYER_SOURCES`.
- Provide `id`, `label`, `movieUrl`, `tvUrl`, and optional params like `colorParam`, `langParam`, and `params`.
- If the source is async or requires custom resolution, set `async: true`.
- The selected source can be changed in settings or default values: `ANIME_DEFAULT_SOURCE` and `NON_ANIME_DEFAULT_SOURCE`.

### 5.3 Adjusting anime detection and anime metadata

Anime detection is in `src/utils/api.js`:
- `isAnimeContent(item, details)` checks TMDB genre IDs and Japanese metadata.
- If you want a broader anime definition, update this function.

AniList fetch logic is also in `src/utils/api.js`.
- To change anime metadata fields, edit `ANILIST_QUERY` and the shape returned by `fetchAnilistData()`.
- The app caches AniList results in `localStorage` and refreshes only after 7 days.

### 5.4 Modifying downloads

Download orchestration is in `src/ipc/downloads.js`.
- `check-downloader` validates the downloader binary.
- `run-download` starts downloads and stores state in `downloads.json`.
- Renderer calls are exposed in `preload.js`.
- If you want to use a different downloader tool, update `run-download` and the renderer download UI in `src/components/DownloadModal.jsx` / `src/pages/DownloadsPage.jsx`.

### 5.5 Modifying appearance and settings

Appearance helpers are in `src/utils/appearance.js`.
- Edit theme presets, accent presets, and CSS variable application there.
- Settings pages are implemented in `src/pages/SettingsPage.jsx`.
- Home layout customization is in `src/utils/homeLayout.js`.

### 5.6 Modifying the library and saved items

Saved media and library data are stored in `localStorage` under keys like `saved`, `savedOrder`, `progress`, and `watched`.
- The library and progress logic is managed in `src/App.jsx`, `src/pages/LibraryPage.jsx`, and `src/pages/DownloadsPage.jsx`.
- To change how saved items are persisted or displayed, work in those files.

## 6. Key Files and What They Do

- `index.js`: Electron main process, app lifecycle, IPC, adblocking, media interception.
- `preload.js`: Safe renderer bridge exposing `window.electron` functions.
- `src/main.jsx`: React DOM renderer.
- `src/App.jsx`: Root application shell and startup flow.
- `src/utils/api.js`: TMDB helper, image URLs, player sources, anime metadata, caching.
- `src/utils/storage.js`: Local and secure storage wrappers.
- `src/ipc/allmanga.js`: Anime stream resolution and AllManga integration.
- `src/ipc/downloads.js`: Download queue and downloader integration.
- `src/ipc/subtitles.js`: Subtitle search and capture logic.
- `src/pages/HomePage.jsx`: Homepage feed, trending layout, and search entry point.
- `src/pages/MoviePage.jsx`: Movie details, streaming, downloads, and watch progress.
- `src/pages/TVPage.jsx`: TV show details, season/episode selection, streaming.
- `src/pages/SettingsPage.jsx`: App settings, API keys, appearance, and advanced settings.

## 7. Running and Building the App

Install dependencies:
```bash
npm install
```

For development or local testing:
```bash
npm run start
```

For building distributions:
```bash
npm run dist:win
npm run dist:linux
npm run dist:mac
```

There are also scripts for platform-specific builds and packaging.

## 8. Important Notes

- A TMDB API key is required for metadata, search, and home content. The app stores it in Electron secure storage.
- The renderer can run without Electron only in development, but secure storage and downloads need Electron.
- `.m3u8` and `.vtt` interception happen in the Electron main process, not in pure browser code.
- Anime uses a special bypass/resolver path because AllManga streams do not work through normal browser-only fetch calls.

---

This document is intended to help you understand how the app is built and where to make changes.
