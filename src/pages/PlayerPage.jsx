/**
 * PlayerPage — fullscreen player view, à la Netflix / Hotstar.
 *
 * Receives all player state from App via props (item, source URL, controls).
 * Renders nothing but the video + overlay controls on a black background.
 * The Back arrow returns to the detail page.
 */

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  PLAYER_SOURCES,
  getSourceUrl,
  sourceIsAsync,
  sourceSupportsProgress,
  sourceProgressViaFrames,
  NEEDS_INTERCEPT,
} from "../utils/api";
import {
  BackIcon,
  SourceIcon,
  ShieldBlockIcon,
  DownloadIcon,
  PopOutIcon,
} from "../components/Icons";
import Loader from "../components/load";
import BlockedStatsModal from "../components/BlockedStatsModal";
import { useBlockedStats } from "../utils/useBlockedStats";
import {
  storage,
  STORAGE_KEYS,
  getFailoverSource,
  setFailoverSource,
  clearFailoverSource,
} from "../utils/storage";

export default function PlayerPage({
  // Core media info
  item,           // { id, title/name, media_type, ... }
  mediaType,      // "movie" | "tv"
  season,         // tv only
  episode,        // tv only (episode number)
  // Player config
  playerSource,
  setPlayerSource,
  resolvedPlayerUrl,   // for async sources (AllManga)
  resolvingUrl,
  resolveError,
  playerAccentColor,
  playerSubLang,
  dubMode,
  setDubMode,
  m3u8Url,
  // Download info
  downloads,
  onGoToDownloads,
  onShowDownload,
  // Progress
  progressKey,
  displayPct,
  progressLabel,
  saveProgress,
  // Actions
  onBack,          // go back to detail page
  onHistory,
  // Async URL reset handler (called when source changes)
  onSourceChange,
}) {
  const isAndroid = typeof window !== "undefined" && !window.electron;

  const webviewRef = useRef(null);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const [pipOpen, setPipOpen] = useState(false);
  const [showSourceMenu, setShowSourceMenu] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const sourceRef = useRef(null);
  const pipUrlRef = useRef(null);
  const pipWebContentsIdRef = useRef(null);

  const progressViaFrames = useMemo(
    () => sourceProgressViaFrames(playerSource),
    [playerSource],
  );

  const {
    sessionTotal: blockedSession,
    showModal: showBlockedModal,
    setShowModal: setShowBlockedModal,
    getSessionDomains: getBlockedDomains,
    alltimeTotal: blockedAlltime,
  } = useBlockedStats(progressKey);

  const currentDownload = useMemo(() => {
    if (!downloads?.length) return null;
    return downloads.find(
      (dl) =>
        dl.tmdbId === item?.id &&
        dl.mediaType === mediaType &&
        (mediaType === "movie" ||
          (dl.season === season && dl.episode === episode)) &&
        (dl.status === "completed" ||
          dl.status === "local" ||
          dl.status === "downloading"),
    );
  }, [downloads, item?.id, mediaType, season, episode]);

  // Hide the Navbar while player is open
  useEffect(() => {
    document.documentElement.setAttribute("data-player-fullscreen", "1");
    return () => {
      document.documentElement.removeAttribute("data-player-fullscreen");
    };
  }, []);

  // Electron webview events
  useEffect(() => {
    if (isAndroid) return;
    const wv = webviewRef.current;
    if (!wv) return;
    const done = () => setWebviewLoading(false);
    wv.addEventListener("did-finish-load", done);
    wv.addEventListener("did-fail-load", done);
    return () => {
      wv.removeEventListener("did-finish-load", done);
      wv.removeEventListener("did-fail-load", done);
    };
  }, [isAndroid, playerSource]);

  // Reset loading overlay when source/episode changes
  useEffect(() => {
    setWebviewLoading(true);
  }, [playerSource, item?.id, season, episode]);

  // PiP handlers
  useEffect(() => {
    const openH = window.electron?.onPipOpened?.(async () => {
      setPipOpen(true);
      pipWebContentsIdRef.current =
        (await window.electron.getPipWebContentsId?.()) ?? null;
    });
    const closeH = window.electron?.onPipClosed?.(() => {
      pipUrlRef.current = null;
      pipWebContentsIdRef.current = null;
      setPipOpen(false);
    });
    return () => {
      if (openH) window.electron?.offPipOpened?.(openH);
      if (closeH) window.electron?.offPipClosed?.(closeH);
    };
  }, []);

  // Fullscreen intercept (Electron — vidsrc etc.)
  useEffect(() => {
    if (!NEEDS_INTERCEPT.includes(playerSource)) return;
    const enterH = window.electron?.onWebviewEnterFullscreen?.(() => {
      document.documentElement.setAttribute("data-player-fullscreen", "1");
    });
    const leaveH = window.electron?.onWebviewLeaveFullscreen?.(() => {
      if (document.fullscreenElement) document.exitFullscreen?.();
    });
    return () => {
      if (enterH) window.electron?.offWebviewEnterFullscreen?.(enterH);
      if (leaveH) window.electron?.offWebviewLeaveFullscreen?.(leaveH);
    };
  }, [playerSource]);

  // Close source menu on outside click
  useEffect(() => {
    if (!showSourceMenu) return;
    const handler = () => setShowSourceMenu(false);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [showSourceMenu]);

  const currentSrc = useMemo(() => {
    if (sourceIsAsync(playerSource)) return resolvedPlayerUrl || "about:blank";
    return getSourceUrl(
      playerSource,
      mediaType,
      item?.id,
      season ?? null,
      episode ?? null,
      {},
      playerAccentColor,
      playerSubLang,
    );
  }, [
    playerSource,
    resolvedPlayerUrl,
    mediaType,
    item?.id,
    season,
    episode,
    playerAccentColor,
    playerSubLang,
  ]);

  const handleSourceChange = useCallback(
    (srcId) => {
      if (srcId === playerSource) return;
      clearFailoverSource(`${mediaType}_${item?.id}_${dubMode}`);
      setPlayerSource(srcId);
      storage.set(STORAGE_KEYS.PLAYER_SOURCE, srcId);
      onSourceChange?.();
      setShowSourceMenu(false);
    },
    [playerSource, mediaType, item?.id, dubMode, setPlayerSource, onSourceChange],
  );

  const handlePipToggle = useCallback(() => {
    if (pipOpen) {
      window.electron?.closePipWindow?.();
      return;
    }
    const url = currentSrc;
    if (!url || url === "about:blank") return;
    pipUrlRef.current = url;
    window.electron?.openPipWindow?.(url, item?.title || item?.name);
  }, [pipOpen, currentSrc, item]);

  const isLoading = webviewLoading && !resolveError;
  const showResolvingLabel = sourceIsAsync(playerSource) && !resolvedPlayerUrl;

  return (
    <div className="player-page">
      {/* ── Back button ──────────────────────────────────────────────────── */}
      <button className="player-page__back" onClick={onBack} title="Back">
        <BackIcon />
        <span className="player-page__back-label">
          {item?.title || item?.name || "Back"}
        </span>
      </button>

      {/* ── Player area ──────────────────────────────────────────────────── */}
      <div className="player-page__player">
        {/* Loading overlay */}
        {isLoading && (
          <div className="player-page__overlay">
            <Loader />
            <span className="player-page__overlay-label">
              {resolvingUrl
                ? "Looking up on AllManga…"
                : `Loading ${PLAYER_SOURCES.find((s) => s.id === playerSource)?.label ?? "source"}…`}
            </span>
          </div>
        )}

        {/* Async resolve error */}
        {sourceIsAsync(playerSource) && resolveError && !resolvingUrl && (
          <div className="player-page__overlay">
            <span style={{ fontSize: 32 }}>⚠️</span>
            <span className="player-page__overlay-label">
              Not found on AllManga
            </span>
            <span style={{ fontSize: 13, color: "var(--text3)", textAlign: "center" }}>
              {resolveError}
            </span>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              Try a different source.
            </span>
          </div>
        )}

        {/* PiP active overlay */}
        {pipOpen && (
          <div className="player-page__overlay">
            <PopOutIcon size={40} />
            <span className="player-page__overlay-label">
              Playing in pop-out
            </span>
            <button
              className="player-overlay-btn"
              onClick={() => window.electron?.closePipWindow?.()}
              style={{ marginTop: 8 }}
            >
              Close pop-out &amp; return
            </button>
          </div>
        )}

        {/* The actual player */}
        {isAndroid ? (
          <iframe
            ref={webviewRef}
            src={pipOpen ? "about:blank" : currentSrc}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setWebviewLoading(false)}
            onError={() => setWebviewLoading(false)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
              background: "#000",
              visibility:
                isLoading || showResolvingLabel ? "hidden" : "visible",
            }}
          />
        ) : (
          <webview
            ref={webviewRef}
            src={pipOpen ? "about:blank" : currentSrc}
            partition="persist:player"
            allowpopups="false"
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
              visibility:
                isLoading || showResolvingLabel ? "hidden" : "visible",
            }}
          />
        )}

        {/* ── Overlay controls ─────────────────────────────────────────── */}
        <div className="player-overlay-group">
          {/* Source picker */}
          <button
            ref={sourceRef}
            className="player-overlay-btn"
            onClick={(e) => {
              e.stopPropagation();
              const rect = sourceRef.current?.getBoundingClientRect();
              if (rect) setMenuPos({ top: rect.bottom + 6, left: rect.left });
              setShowSourceMenu((v) => !v);
            }}
            title="Change source"
          >
            <SourceIcon />
            {PLAYER_SOURCES.find((s) => s.id === playerSource)?.label ?? "Source"}
          </button>

          {/* Sub/Dub toggle (AllManga only) */}
          {sourceIsAsync(playerSource) && (
            <button
              className="player-overlay-btn"
              onClick={() => {
                const next = dubMode === "sub" ? "dub" : "sub";
                setDubMode(next);
                storage.set(STORAGE_KEYS.ALLMANGA_DUB_MODE, next);
                onSourceChange?.();
              }}
              title="Toggle Sub/Dub"
            >
              {dubMode === "sub" ? "SUB" : "DUB"}
            </button>
          )}

          {/* Blocked ads */}
          <button
            className="player-overlay-btn"
            onClick={() => {
              setShowSourceMenu(false);
              setShowBlockedModal(true);
            }}
            title="Blocked ads & trackers"
          >
            <ShieldBlockIcon />
            {blockedSession > 0 && (
              <span className="player-blocked-badge">{blockedSession}</span>
            )}
          </button>

          {/* Pop-out (Electron only) */}
          {!isAndroid && (
            <button
              className="player-overlay-btn"
              onClick={handlePipToggle}
              title={pipOpen ? "Close pop-out" : "Pop out player"}
              disabled={
                !pipOpen &&
                (webviewLoading || !!(sourceIsAsync(playerSource) && !resolvedPlayerUrl))
              }
              style={pipOpen ? { color: "var(--red)" } : undefined}
            >
              <PopOutIcon />
            </button>
          )}
        </div>

        {/* Source dropdown */}
        {showSourceMenu && menuPos && (
          <div
            className="source-dropdown source-dropdown--fixed"
            style={{ top: menuPos.top, left: menuPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {PLAYER_SOURCES.map((src) => (
              <button
                key={src.id}
                className={
                  "source-dropdown__item" +
                  (playerSource === src.id ? " source-dropdown__item--active" : "")
                }
                onClick={() => handleSourceChange(src.id)}
              >
                <span>{src.label}</span>
                {src.tag && (
                  <span className="source-dropdown__tag">{src.tag}</span>
                )}
                {src.note && (
                  <span className="source-dropdown__note">{src.note}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Download button */}
        <button
          className="player-overlay-btn"
          style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}
          onClick={() =>
            currentDownload
              ? onGoToDownloads?.(currentDownload.id)
              : onShowDownload?.()
          }
          title={currentDownload ? "View download" : "Download"}
        >
          {currentDownload ? (
            <span
              className="player-downloaded-icon"
              style={{
                color:
                  currentDownload.status === "downloading"
                    ? "var(--red)"
                    : "#4caf50",
              }}
            >
              {currentDownload.status === "downloading" ? "↓" : "✓"}
            </span>
          ) : (
            <DownloadIcon />
          )}
          {!currentDownload && m3u8Url && (
            <span className="player-overlay-dot" />
          )}
          {!sourceSupportsProgress(playerSource) && (
            <span
              className="player-no-progress-hint"
              title="No automatic progress tracking for this source"
            >
              ⚠ no tracking
            </span>
          )}
        </button>
      </div>

      {/* ── Progress bar + mark buttons ────────────────────────────────── */}
      {displayPct > 0 && (
        <div className="player-page__progress">
          <div className="progress-bar-outer" style={{ flex: 1 }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(displayPct, 100)}%` }}
            />
          </div>
          <span style={{ fontSize: 12, color: "var(--text3)", flexShrink: 0 }}>
            {progressLabel}
          </span>
        </div>
      )}
      <div className="player-page__mark-row">
        <span style={{ fontSize: 12, color: "var(--text3)" }}>
          Mark progress:
        </span>
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            className="btn btn-ghost"
            style={{ padding: "5px 14px", fontSize: 12 }}
            onClick={() => saveProgress(progressKey, p)}
          >
            {p}%
          </button>
        ))}
      </div>

      {showBlockedModal && (
        <BlockedStatsModal
          sessionTotal={blockedSession}
          alltimeTotal={blockedAlltime}
          domains={getBlockedDomains()}
          onClose={() => setShowBlockedModal(false)}
        />
      )}
    </div>
  );
}
