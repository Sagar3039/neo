import { useState, useEffect, useMemo } from "react";
import { imgUrl, tmdbFetch } from "../utils/api";
import { BookmarkIcon, BookmarkFillIcon, PlayIcon, StarIcon } from "../components/Icons";
import SagarRow from "../components/SagarRow";

const CATEGORY_CONFIG = [
  { key: "trending", title: "Trending TV Shows",   path: "/trending/tv/week" },
  { key: "popular",  title: "Popular TV Shows",    path: "/tv/popular?page=1" },
  { key: "topRated", title: "Top Rated TV Shows",  path: "/tv/top_rated?page=1" },
  { key: "drama",    title: "Drama Series",        path: "/discover/tv?with_genres=18&page=1" },
  { key: "crime",    title: "Crime Series",        path: "/discover/tv?with_genres=80&page=1" },
  { key: "thriller", title: "Thriller Series",     path: "/discover/tv?with_genres=53&page=1" },
  { key: "comedy",   title: "Comedy Series",       path: "/discover/tv?with_genres=35&page=1" },
  { key: "scifi",    title: "Sci-Fi & Fantasy",    path: "/discover/tv?with_genres=10765&page=1" },
];

// ── Hero: GPU-safe, no backdrop-filter, no CSS filter ───────────────────
function TVHero({ hero, items = [], onSelect, onToggleSave, isSaved }) {
  if (!hero) return null;
  const title = hero.name || hero.title || "Featured Series";
  const year = (hero.first_air_date || "").slice(0, 4);
  const rating = hero.vote_average ? hero.vote_average.toFixed(1) : null;
  const backdrop = hero.backdrop_path || hero.poster_path;
  // Show 3 cards in the stage area — the main + 2 secondary
  const stageItems = items.slice(0, 3);

  return (
    <section className="neo-tv-hero">
      {backdrop && (
        <div
          className="neo-tv-hero__backdrop"
          style={{ backgroundImage: `url(${imgUrl(backdrop, "original")})` }}
        />
      )}

      <div className="neo-tv-hero__content">
        <p className="neo-tv-hero__eyebrow">Series Spotlight</p>
        <h1 className="neo-tv-hero__title">{title}</h1>
        <div className="neo-tv-hero__meta">
          {rating && (
            <span className="neo-tv-hero__chip">
              <StarIcon size={12} /> {rating}
            </span>
          )}
          {year && <span className="neo-tv-hero__chip">{year}</span>}
          <span className="neo-tv-hero__chip">Series</span>
        </div>
        {hero.overview && (
          <p className="neo-tv-hero__overview">{hero.overview}</p>
        )}
        <div className="neo-tv-hero__actions">
          <button className="neo-hero-btn neo-hero-btn--play" onClick={() => onSelect?.(hero)}>
            <PlayIcon /> Start Watching
          </button>
          <button className="neo-hero-btn neo-hero-btn--secondary" onClick={() => onToggleSave?.(hero)}>
            {isSaved?.(hero) ? <BookmarkFillIcon /> : <BookmarkIcon />}
            {isSaved?.(hero) ? "Saved" : "My List"}
          </button>
        </div>
      </div>

      <div className="neo-tv-hero__screens">
        {stageItems.map((item, i) => {
          const img = item.poster_path || item.backdrop_path;
          if (!img) return null;
          return (
            <button key={item.id} className="neo-tv-screen" onClick={() => onSelect?.(item)}>
              <span style={{ backgroundImage: `url(${imgUrl(img, "w500")})` }} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ── Top 10 for TV ────────────────────────────────────────────────────────
function Top10Row({ items = [], onSelect }) {
  if (!items.length) return null;
  return (
    <div className="neo-section">
      <div className="neo-section__header">
        <h2 className="neo-section__title">Top 10 Series</h2>
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

export default function TVShowsPage({
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
        setHero(next.trending?.[0] || next.popular?.[0] || null);
      })
      .catch((e) => console.warn("TVShowsPage load failed", e))
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [apiKey, offline]);

  useEffect(() => {
    if (!apiKey || offline || !history?.length) return;
    const tvHistory = history.filter((i) => i.media_type === "tv");
    if (!tvHistory.length) return;
    let cancelled = false;

    Promise.all(
      tvHistory.slice(0, 3).map((src) =>
        tmdbFetch(`/tv/${src.id}/recommendations`, apiKey)
          .then((d) => (d.results || []).map((i) => ({ ...i, media_type: "tv" })))
          .catch(() => [])
      )
    ).then((arrays) => {
      if (cancelled) return;
      const seen = new Set();
      const dedup = [];
      arrays.flat().forEach((item) => {
        const k = `tv_${item.id}`;
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
      <TVHero
        hero={hero}
        items={sections.trending || []}
        onSelect={onSelect}
        onToggleSave={onToggleSave}
        isSaved={isSaved}
      />

      <div className="neo-page-header">
        <p className="neo-page-eyebrow">Television</p>
        <h1 className="neo-page-title">TV SHOWS</h1>
        <p className="neo-page-subtitle">Every series worth watching, all in one place.</p>
      </div>

      <Top10Row items={sections.trending || []} onSelect={onSelect} />

      <SagarRow title="Trending This Week" items={sections.trending} badge="HOT" loading={loading} {...rowProps} />
      <SagarRow title="Popular Series" items={sections.popular} loading={loading && !sections.popular} {...rowProps} />
      <SagarRow title="Top Rated All Time" items={sections.topRated} badge="★ RATED" loading={loading && !sections.topRated} {...rowProps} />
      <SagarRow title="Drama" items={sections.drama} loading={loading && !sections.drama} {...rowProps} />
      <SagarRow title="Crime" items={sections.crime} loading={loading && !sections.crime} {...rowProps} />
      <SagarRow title="Thriller" items={sections.thriller} loading={loading && !sections.thriller} {...rowProps} />
      <SagarRow title="Comedy" items={sections.comedy} loading={loading && !sections.comedy} {...rowProps} />
      <SagarRow title="Sci-Fi & Fantasy" items={sections.scifi} loading={loading && !sections.scifi} {...rowProps} />
      {topPicks.length > 0 && (
        <SagarRow title="Recommended for You" items={topPicks} badge="PICK" {...rowProps} />
      )}
    </div>
  );
}
