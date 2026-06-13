import { memo, useCallback, useState, useRef } from "react";
import { imgUrl, isAnimeContent } from "../utils/api";
import { PlayIcon, BookmarkIcon, BookmarkFillIcon, WatchedIcon } from "./Icons";

const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 10770: "TV Movie",
  53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News",
  10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap",
  10767: "Talk", 10768: "War & Politics",
};

function getGenreLabels(item) {
  const ids = item.genre_ids || (item.genres || []).map((g) => g.id);
  return ids.slice(0, 3).map((id) => GENRE_MAP[id]).filter(Boolean);
}

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
  const overview = item.overview || "";
  const genres = getGenreLabels(item);
  const runtime = item.runtime ? `${item.runtime}m` : isTV ? "Series" : null;
  const language = item.original_language ? item.original_language.toUpperCase() : null;

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

  const [hovered, setHovered] = useState(false);
  const hoverTimer = useRef(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(true), 220);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setHovered(false);
  }, []);

  const handleSave = useCallback((e) => {
    e.stopPropagation();
    onToggleSave?.();
  }, [onToggleSave]);

  const handlePlay = useCallback((e) => {
    e.stopPropagation();
    if (!isSoon) onClick?.();
  }, [isSoon, onClick]);

  let badgeLabel = isAnime ? "ANIME" : isTV ? "TV" : "HD";
  let badgeClass = "neo-card__badge";
  if (isSoon) { badgeLabel = "SOON"; badgeClass += " neo-card__badge--soon"; }
  else if (isAnime) { badgeClass += " neo-card__badge--anime"; }
  else if (isTV) { badgeClass += " neo-card__badge--tv"; }

  // Banner: prefer backdrop (wider, more cinematic), always fall back to poster.
  // TMDB list endpoints rarely include backdrop_path — poster is the reliable source.
  const bannerUrl = item.backdrop_path
    ? imgUrl(item.backdrop_path, "w780")
    : item.poster_path
    ? imgUrl(item.poster_path, "w342")
    : null;

  return (
    <div
      className={`neo-card${hovered ? " neo-card--expanded" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={isSoon ? undefined : onClick}
    >
      {/* ── Base poster (always visible) ── */}
      <div className="neo-card__poster">
        {item.poster_path ? (
          <img
            src={imgUrl(item.poster_path, "w342")}
            alt={title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="neo-card__no-image">
            <span>No Image</span>
          </div>
        )}

        <div className="neo-card__overlay">
          {!isSoon && (
            <div className="neo-card__play-icon">
              <PlayIcon />
            </div>
          )}
        </div>

        <span className={badgeClass}>{badgeLabel}</span>

        <button
          className={`neo-card__save-btn${isSaved ? " neo-card__save-btn--saved" : ""}`}
          onClick={handleSave}
          title={isSaved ? "Remove" : "Save"}
        >
          {isSaved ? <BookmarkFillIcon /> : <BookmarkIcon />}
        </button>

        {progress > 0 && !isWatched && !isSoon && (
          <div className="neo-card__progress">
            <div
              className="neo-card__progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        {isWatched && !isSoon && (
          <div className="neo-card__watched-icon">
            <WatchedIcon size={20} />
          </div>
        )}
      </div>

      {/* ── Collapsed info strip ── */}
      <div className="neo-card__info">
        <div className="neo-card__title" title={title}>{title}</div>
        <div className="neo-card__meta">
          {year && <span>{year}</span>}
          {year && rating && <span className="neo-card__meta-dot" />}
          {rating && (
            <span className="neo-card__rating">★ {rating}</span>
          )}
        </div>
      </div>

      {/* ── Expanded hover panel ── */}
      <div className="neo-card__expand" aria-hidden={!hovered}>
        {/* Banner image — poster always available, backdrop when lucky */}
        <div className="neo-card__expand-banner">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt={title}
              loading="eager"
              decoding="async"
            />
          )}
          <div className="neo-card__expand-banner-grad" />
          <span className={`${badgeClass} neo-card__expand-badge`}>{badgeLabel}</span>
        </div>

        {/* Content */}
        <div className="neo-card__expand-body">
          <h3 className="neo-card__expand-title">{title}</h3>

          {/* Meta row */}
          <div className="neo-card__expand-meta">
            {rating && (
              <span className="neo-card__expand-rating">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {rating}
              </span>
            )}
            {year && <span className="neo-card__expand-year">{year}</span>}
            {runtime && <span className="neo-card__expand-runtime">{runtime}</span>}
            {language && (
              <span className="neo-card__expand-lang">{language}</span>
            )}
          </div>

          {/* Genre pills */}
          {genres.length > 0 && (
            <div className="neo-card__expand-genres">
              {genres.map((g) => (
                <span key={g} className="neo-card__expand-genre">{g}</span>
              ))}
            </div>
          )}

          {/* Description */}
          {overview && (
            <p className="neo-card__expand-overview">
              {overview.length > 120 ? overview.slice(0, 117) + "…" : overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="neo-card__expand-actions">
            {!isSoon ? (
              <button className="neo-card__expand-play" onClick={handlePlay}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Now
              </button>
            ) : (
              <span className="neo-card__expand-soon">Coming Soon</span>
            )}
            <button
              className={`neo-card__expand-save${isSaved ? " neo-card__expand-save--saved" : ""}`}
              onClick={handleSave}
              title={isSaved ? "Remove from list" : "Add to list"}
            >
              {isSaved ? <BookmarkFillIcon /> : <BookmarkIcon />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default NeoCard;
