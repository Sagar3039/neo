import { useState, useEffect, useMemo } from "react";
import { imgUrl, tmdbFetch } from "../utils/api";
import { BookmarkIcon, BookmarkFillIcon, PlayIcon, StarIcon } from "../components/Icons";
import SagarRow from "../components/SagarRow";

const CATEGORY_CONFIG = [
  { key: "trending",    title: "Trending Anime",     path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "newReleases", title: "New Anime",          path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=first_air_date.desc&page=1" },
  { key: "topRated",    title: "Top Rated Anime",    path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=200&page=1" },
  { key: "action",      title: "Action Anime",       path: "/discover/tv?with_genres=16,28&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "fantasy",     title: "Fantasy Anime",      path: "/discover/tv?with_genres=16,14&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "romance",     title: "Romance Anime",      path: "/discover/tv?with_genres=16,10749&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "shounen",     title: "Shounen Favorites",  path: "/discover/tv?with_genres=16,35&with_original_language=ja&sort_by=popularity.desc&page=1" },
];

// ── Anime Hero: GPU-safe, card cluster visual ────────────────────────────
function AnimeHero({ hero, items = [], onSelect, onToggleSave, isSaved }) {
  if (!hero) return null;
  const title = hero.name || hero.title || "Anime";
  const year = (hero.first_air_date || "").slice(0, 4);
  const rating = hero.vote_average ? hero.vote_average.toFixed(1) : null;
  const backdrop = hero.backdrop_path || hero.poster_path;
  const clusterItems = items.slice(0, 3);

  return (
    <section className="neo-anime-hero">
      {backdrop && (
        <div
          className="neo-anime-hero__backdrop"
          style={{ backgroundImage: `url(${imgUrl(backdrop, "original")})` }}
        />
      )}

      <div className="neo-anime-hero__content">
        <p className="neo-anime-hero__eyebrow">Anime Showcase</p>
        <h1 className="neo-anime-hero__title">{title}</h1>
        <div className="neo-anime-hero__meta">
          {rating && (
            <span className="neo-anime-hero__chip">
              <StarIcon size={12} /> {rating}
            </span>
          )}
          {year && <span className="neo-anime-hero__chip">{year}</span>}
          <span className="neo-anime-hero__chip">Series</span>
        </div>
        {hero.overview && (
          <p className="neo-anime-hero__overview">{hero.overview}</p>
        )}
        <div className="neo-anime-hero__actions">
          <button className="neo-hero-btn neo-hero-btn--anime" onClick={() => onSelect?.(hero)}>
            <PlayIcon /> Watch Now
          </button>
          <button className="neo-hero-btn neo-hero-btn--secondary" onClick={() => onToggleSave?.(hero)}>
            {isSaved?.(hero) ? <BookmarkFillIcon /> : <BookmarkIcon />}
            {isSaved?.(hero) ? "Saved" : "My List"}
          </button>
        </div>
      </div>

      <div className="neo-anime-hero__cards">
        {clusterItems.map((item, i) => {
          const img = item.poster_path;
          if (!img) return null;
          return (
            <button key={item.id} className="neo-anime-poster" onClick={() => onSelect?.(item)}>
              <img src={imgUrl(img, "w500")} alt="" loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Anime Top 10 ─────────────────────────────────────────────────────────
function Top10Row({ items = [], onSelect }) {
  if (!items.length) return null;
  return (
    <div className="neo-section">
      <div className="neo-section__header">
        <h2 className="neo-section__title">Top 10 Anime</h2>
        <span className="neo-section__badge" style={{ color: "#c084fc", borderColor: "rgba(192,132,252,0.4)" }}>CHARTS</span>
      </div>
      <div className="neo-top10-row">
        {items.slice(0, 10).map((item, i) => (
          <div key={item.id} className="neo-top10-item" onClick={() => onSelect?.(item)}>
            <span className="neo-top10-num">{i + 1}</span>
            <div className="neo-top10-card">
              {item.poster_path ? (
                <img
                  src={imgUrl(item.poster_path, "w342")}
                  alt={item.name || item.title}
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

export default function AnimePage({
  apiKey,
  progress,
  watched,
  history,
  inProgress,
  onSelect,
  onToggleSave,
  isSaved,
  onMarkWatched,
  onMarkUnwatched,
  offline,
}) {
  const [sections, setSections] = useState({});
  const [hero, setHero] = useState(null);
  const [loading, setLoading] = useState(false);

  const continueWatching = useMemo(() => {
    if (!inProgress?.length) return [];
    return inProgress.filter((item) => item.media_type === "tv").slice(0, 12);
  }, [inProgress]);

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
            .map((item) => ({ ...item, media_type: "tv" }));
        });
        setSections(next);
        setHero(next.topRated?.[0] || next.trending?.[0] || null);
      })
      .catch((e) => console.warn("AnimePage load failed", e))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiKey, offline]);

  const rowProps = { onSelect, progress, watched, onToggleSave, isSaved };

  return (
    <div className="neo-page">
      <AnimeHero
        hero={hero}
        items={sections.topRated || sections.trending || []}
        onSelect={onSelect}
        onToggleSave={onToggleSave}
        isSaved={isSaved}
      />

      <div className="neo-page-header">
        <p className="neo-page-eyebrow" style={{ color: "#c084fc" }}>Anime</p>
        <h1 className="neo-page-title">ANIME</h1>
        <p className="neo-page-subtitle">The best of Japanese animation, curated for you.</p>
      </div>

      <Top10Row items={sections.topRated || []} onSelect={onSelect} />

      {continueWatching.length > 0 && (
        <SagarRow title="Continue Watching" items={continueWatching} badge="IN PROGRESS" {...rowProps} />
      )}

      <SagarRow title="Trending Now" items={sections.trending} badge="🔥" loading={loading} {...rowProps} />
      <SagarRow title="New Anime" items={sections.newReleases} badge="NEW" loading={loading && !sections.newReleases} {...rowProps} />
      <SagarRow title="Top Rated All Time" items={sections.topRated} badge="★ RATED" loading={loading && !sections.topRated} {...rowProps} />
      <SagarRow title="Action" items={sections.action} loading={loading && !sections.action} {...rowProps} />
      <SagarRow title="Fantasy" items={sections.fantasy} loading={loading && !sections.fantasy} {...rowProps} />
      <SagarRow title="Romance" items={sections.romance} loading={loading && !sections.romance} {...rowProps} />
      <SagarRow title="Shounen Favorites" items={sections.shounen} loading={loading && !sections.shounen} {...rowProps} />
    </div>
  );
}
