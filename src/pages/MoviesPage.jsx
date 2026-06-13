import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { imgUrl, tmdbFetch } from "../utils/api";
import { BookmarkIcon, BookmarkFillIcon, PlayIcon, StarIcon } from "../components/Icons";
import NeoRow from "../components/NeoRow";

const CATEGORY_CONFIG = [
  { key: "trending",    title: "Trending Movies",   path: "/trending/movie/week" },
  { key: "popular",    title: "Popular Movies",     path: "/movie/popular?page=1" },
  { key: "topRated",   title: "Top Rated",          path: "/movie/top_rated?page=1" },
  { key: "action",     title: "Action",             path: "/discover/movie?with_genres=28&page=1" },
  { key: "comedy",     title: "Comedy",             path: "/discover/movie?with_genres=35&page=1" },
  { key: "horror",     title: "Horror",             path: "/discover/movie?with_genres=27&page=1" },
  { key: "sciFi",      title: "Sci-Fi",             path: "/discover/movie?with_genres=878&page=1" },
  { key: "newReleases",title: "New Releases",       path: "/movie/now_playing?page=1" },
];

// ── Hero: GPU-safe (no backdrop-filter, no CSS filter on image) ──────────
function MoviesHero({ hero, items = [], onSelect, onToggleSave, isSaved }) {
  if (!hero) return null;
  const title = hero.title || hero.name || "Featured Movie";
  const year = (hero.release_date || "").slice(0, 4);
  const rating = hero.vote_average ? hero.vote_average.toFixed(1) : null;
  const heroArt = hero.backdrop_path || hero.poster_path;
  const wallItems = items.slice(1, 5);

  return (
    <section className="neo-movies-hero">
      {heroArt && (
        <div
          className="neo-movies-hero__backdrop"
          style={{ backgroundImage: `url(${imgUrl(heroArt, "original")})` }}
        />
      )}
      <div className="neo-movies-hero__content">
        <p className="neo-movies-hero__eyebrow">Now Playing</p>
        <h1 className="neo-movies-hero__title">{title}</h1>
        <div className="neo-movies-hero__meta">
          {rating && (
            <span className="neo-movies-hero__chip">
              <StarIcon size={12} /> {rating}
            </span>
          )}
          {year && <span className="neo-movies-hero__chip">{year}</span>}
          <span className="neo-movies-hero__chip">Movie</span>
        </div>
        {hero.overview && (
          <p className="neo-movies-hero__overview">{hero.overview}</p>
        )}
        <div className="neo-movies-hero__actions">
          <button className="neo-hero-btn neo-hero-btn--play" onClick={() => onSelect?.(hero)}>
            <PlayIcon /> Play
          </button>
          <button className="neo-hero-btn neo-hero-btn--secondary" onClick={() => onToggleSave?.(hero)}>
            {isSaved?.(hero) ? <BookmarkFillIcon /> : <BookmarkIcon />}
            {isSaved?.(hero) ? "Saved" : "My List"}
          </button>
        </div>
      </div>

      <div className="neo-movies-hero__stage">
        {hero.poster_path && (
          <button className="neo-movies-hero__poster-main" onClick={() => onSelect?.(hero)}>
            <img src={imgUrl(hero.poster_path, "w500")} alt="" loading="eager" decoding="async" />
          </button>
        )}
        {wallItems.length > 0 && (
          <div className="neo-movies-hero__poster-wall">
            {wallItems.map((item) =>
              item.poster_path ? (
                <button key={item.id} className="neo-movies-hero__poster-tile" onClick={() => onSelect?.(item)}>
                  <img src={imgUrl(item.poster_path, "w342")} alt="" loading="lazy" decoding="async" />
                </button>
              ) : null
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Top 10 Row ───────────────────────────────────────────────────────────
function Top10Row({ items = [], onSelect }) {
  if (!items.length) return null;
  return (
    <div className="neo-section">
      <div className="neo-section__header">
        <h2 className="neo-section__title">Top 10 Today</h2>
        <span className="neo-section__badge">CHARTS</span>
      </div>
      <div className="neo-top10-row">
        {items.slice(0, 10).map((item, i) => (
          <div key={item.id} className="neo-top10-item" onClick={() => onSelect?.(item)}>
            <span className="neo-top10-num">{i + 1}</span>
            <div className="neo-top10-card">
              {item.poster_path ? (
                <img
                  src={imgUrl(item.poster_path, "w342")}
                  alt={item.title || item.name}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "var(--surface2)" }} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MoviesPage({
  apiKey,
  history,
  progress,
  watched,
  onSelect,
  onToggleSave,
  isSaved,
  onMarkWatched,
  onMarkUnwatched,
  offline,
}) {
  const [sections, setSections] = useState({});
  const [recommended, setRecommended] = useState([]);
  const [hero, setHero] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Parallel fetch — no waterfall ──────────────────────────────────────
  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;
    setLoading(true);

    Promise.all(CATEGORY_CONFIG.map((c) => tmdbFetch(c.path, apiKey)))
      .then((results) => {
        if (cancelled) return;
        const next = {};
        CATEGORY_CONFIG.forEach((c, i) => {
          next[c.key] = (results[i].results || [])
            .slice(0, 14)
            .map((item) => ({ ...item, media_type: "movie" }));
        });
        setSections(next);
        setHero(next.trending?.[0] || next.popular?.[0] || null);
      })
      .catch((e) => console.warn("MoviesPage load failed", e))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiKey, offline]);

  // ── Recommendations — separate effect so hero loads first ──────────────
  useEffect(() => {
    if (!apiKey || offline || !history?.length) return;
    const movieHistory = history.filter((i) => i.media_type === "movie");
    if (!movieHistory.length) return;
    let cancelled = false;

    Promise.all(
      movieHistory.slice(0, 3).map((src) =>
        tmdbFetch(`/movie/${src.id}/recommendations`, apiKey)
          .then((d) => (d.results || []).map((i) => ({ ...i, media_type: "movie" })))
          .catch(() => [])
      )
    ).then((arrays) => {
      if (cancelled) return;
      const seen = new Set();
      const dedup = [];
      arrays.flat().forEach((item) => {
        const k = `movie_${item.id}`;
        if (!seen.has(k)) { seen.add(k); dedup.push(item); }
      });
      setRecommended(dedup.slice(0, 14));
    });

    return () => { cancelled = true; };
  }, [apiKey, history, offline]);

  const topPicks = useMemo(
    () => (recommended.length > 0 ? recommended : sections.popular || []),
    [recommended, sections.popular]
  );

  const rowProps = { onSelect, progress, watched, onToggleSave, isSaved };

  return (
    <div className="neo-page">
      <MoviesHero
        hero={hero}
        items={sections.trending || []}
        onSelect={onSelect}
        onToggleSave={onToggleSave}
        isSaved={isSaved}
      />

      <div className="neo-page-header">
        <p className="neo-page-eyebrow">Movies</p>
        <h1 className="neo-page-title">MOVIES</h1>
        <p className="neo-page-subtitle">Cinema-quality discovery, every title.</p>
      </div>

      <Top10Row items={sections.trending || []} onSelect={onSelect} />

      <NeoRow title="Trending This Week" items={sections.trending} badge="HOT" loading={loading} {...rowProps} />
      <NeoRow title="Popular Movies" items={sections.popular} loading={loading && !sections.popular} {...rowProps} />
      <NeoRow title="Top Rated All Time" items={sections.topRated} badge="★ RATED" loading={loading && !sections.topRated} {...rowProps} />
      <NeoRow title="New Releases" items={sections.newReleases} badge="NEW" loading={loading && !sections.newReleases} {...rowProps} />
      <NeoRow title="Action" items={sections.action} loading={loading && !sections.action} {...rowProps} />
      <NeoRow title="Comedy" items={sections.comedy} loading={loading && !sections.comedy} {...rowProps} />
      <NeoRow title="Horror" items={sections.horror} loading={loading && !sections.horror} {...rowProps} />
      <NeoRow title="Sci-Fi" items={sections.sciFi} loading={loading && !sections.sciFi} {...rowProps} />
      {topPicks.length > 0 && (
        <NeoRow title="Recommended for You" items={topPicks} badge="PICK" {...rowProps} />
      )}
    </div>
  );
}
