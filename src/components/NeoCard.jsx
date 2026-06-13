import { memo, useCallback } from "react";
import { imgUrl, isAnimeContent } from "../utils/api";
import { PlayIcon, BookmarkIcon, BookmarkFillIcon, WatchedIcon } from "./Icons";

/**
 * NeoCard — Performance-optimized media card.
 *
 * Key improvements over original MediaCard / PremiumCard:
 *  1. No framer-motion — hover effect is pure CSS (no JS on every frame)
 *  2. `contain: layout style` declared in CSS to prevent reflow propagation
 *  3. `will-change: transform` pre-promotes GPU layer
 *  4. Single DOM element per card — no AnimatePresence popup panel
 *  5. memo() prevents re-render when parent state changes unrelated props
 */
const NeoCard = memo(function NeoCard({
  item,
  onClick,
  progress = 0,
  watched,
  onToggleSave,
  isSaved: isSavedProp,
}) {
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const isTV = item.media_type === "tv" || !!item.first_air_date;
  const isAnime = isAnimeContent(item);
  const isSaved = !!isSavedProp;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  const rawDate = item.release_date || item.first_air_date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isSoon = rawDate ? new Date(rawDate) > today : false;

  const watchedKey = isTV
    ? item.season != null && item.episode != null
      ? `tv_${item.id}_s${item.season}e${item.episode}`
      : `tv_${item.id}`
    : `movie_${item.id}`;
  const isWatched = !!watched?.[watchedKey];

  const handleSave = useCallback((e) => {
    e.stopPropagation();
    onToggleSave?.();
  }, [onToggleSave]);

  let badgeLabel = isAnime ? "ANIME" : isTV ? "TV" : "HD";
  let badgeClass = "neo-card__badge";
  if (isSoon) { badgeLabel = "SOON"; badgeClass += " neo-card__badge--soon"; }
  else if (isAnime) { badgeClass += " neo-card__badge--anime"; }
  else if (isTV) { badgeClass += " neo-card__badge--tv"; }

  return (
    <div className="neo-card" onClick={isSoon ? undefined : onClick}>
      <div className="neo-card__poster">
        {item.poster_path ? (
          <img
            src={imgUrl(item.poster_path, "w342")}
            alt={title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text3)" }}>No Image</span>
          </div>
        )}

        {/* Hover overlay — pure CSS, no JS per-frame */}
        <div className="neo-card__overlay">
          {!isSoon && (
            <div className="neo-card__play-icon">
              <PlayIcon />
            </div>
          )}
        </div>

        <span className={badgeClass}>{badgeLabel}</span>

        <button className={`neo-card__save-btn${isSaved ? " neo-card__save-btn--saved" : ""}`} onClick={handleSave} title={isSaved ? "Remove" : "Save"}>
          {isSaved ? <BookmarkFillIcon /> : <BookmarkIcon />}
        </button>

        {progress > 0 && !isWatched && !isSoon && (
          <div className="neo-card__progress">
            <div className="neo-card__progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        )}

        {isWatched && !isSoon && (
          <div style={{ position: "absolute", bottom: 8, right: 8 }}>
            <WatchedIcon size={20} />
          </div>
        )}
      </div>

      <div className="neo-card__info">
        <div className="neo-card__title" title={title}>{title}</div>
        <div className="neo-card__meta">
          {year && <span>{year}</span>}
          {year && rating && <span className="neo-card__meta-dot" />}
          {rating && (
            <span className="neo-card__rating">
              ★ {rating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

export default NeoCard;
