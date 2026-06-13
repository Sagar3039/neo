import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { imgUrl, tmdbFetch } from "../utils/api";
import HeroBanner from "../components/HeroBanner";
import TrailerModal from "../components/TrailerModal";
import NeoRow from "../components/NeoRow";
import { PlayIcon, BookmarkIcon, BookmarkFillIcon, CloseIcon } from "../components/Icons";

const GENRE_MAP = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
  10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
  10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
};

const GENRE_CARDS = [
  { id: 28,    name: "Action",    bg: "/7zoHgR1Xgjo6N3NDRt549t0vup9.jpg" },
  { id: 27,    name: "Horror",    bg: "/532GOj2wgaR08QEU6aZ74154U5s.jpg" },
  { id: 878,   name: "Sci-Fi",    bg: "/xJHokZbljvjC4nQ61ZcAADfgZPr.jpg" },
  { id: 35,    name: "Comedy",    bg: "/nMKdUU5685iGShpy79Y956jn2y9.jpg" },
  { id: 80,    name: "Crime",     bg: "/9Ke74JCEgl4Ubjls6gx07h6t1Y5.jpg" },
  { id: 14,    name: "Fantasy",   bg: "/zG0qZ2n6Ty4Q2HUXz3hN11Z3Q2.jpg" },
  { id: 10749, name: "Romance",   bg: "/ggNt5d66rSVEwJ9XQ31S8ZJ8H55.jpg" },
  { id: 12,    name: "Adventure", bg: "/8Y43oiuiILqDsaqqvUwf4j596tU.jpg" },
];

// ── Continue Watching Card — GPU-optimised, CSS hover only ───────────────
function ContinueWatchingCard({ item, progress = 0, onClick, details }) {
  const bgUrl = details?.backdrop_path || item.backdrop_path || item.poster_path;
  const pct = Math.min(progress, 100);
  const totalMin = item.media_type === "tv" ? 45 : 120;
  const remaining = pct > 0 && pct < 100
    ? (() => {
        const m = Math.round(totalMin * (100 - pct) / 100);
        return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m left` : `${m}m left`;
      })()
    : null;

  return (
    <div className="neo-cw-card" onClick={onClick}>
      <div className="neo-cw-backdrop">
        {bgUrl ? (
          <img src={imgUrl(bgUrl, "w500")} alt={item.title} loading="lazy" decoding="async" />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--surface2)" }} />
        )}
        <div className="neo-cw-backdrop-overlay">
          <button className="neo-cw-play" title="Resume">
            <PlayIcon />
          </button>
        </div>
        {pct > 0 && (
          <div className="neo-cw-progress">
            <div className="neo-cw-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="neo-cw-info">
        <div className="neo-cw-title">{item.title}</div>
        <div className="neo-cw-episode">
          {item.media_type === "tv" && item.season != null && item.episode != null
            ? `S${item.season} · E${item.episode}${item.episodeName ? ` — ${item.episodeName}` : ""}`
            : "Resume Movie"}
        </div>
        {remaining && <div className="neo-cw-remaining">{remaining}</div>}
      </div>
    </div>
  );
}

// ── Genre Grid ───────────────────────────────────────────────────────────
function GenreGrid({ onGenreSelect }) {
  return (
    <div className="neo-section">
      <div className="neo-section__header">
        <h2 className="neo-section__title">Browse by Genre</h2>
        <span className="neo-section__badge">CATEGORIES</span>
      </div>
      <div className="neo-genre-grid">
        {GENRE_CARDS.map((g) => (
          <div key={g.id} className="neo-genre-card" onClick={() => onGenreSelect?.(g)}>
            <div
              className="neo-genre-card__bg"
              style={{ backgroundImage: `url(${imgUrl(g.bg, "w500")})` }}
            />
            <div className="neo-genre-card__overlay" />
            <span className="neo-genre-card__label">{g.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top-10 Row ───────────────────────────────────────────────────────────
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

// ── Category Tabs (no Framer Motion layout animation on underline) ───────
function CategoryTabs({ active, onChange }) {
  const tabs = [
    { id: "movies",  label: "Movies" },
    { id: "tvshows", label: "TV Shows" },
    { id: "anime",   label: "Anime" },
  ];
  return (
    <div className="neo-tabs">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={`neo-tab${active === t.id ? " neo-tab--active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN HOMEPAGE
// ══════════════════════════════════════════════════════════════════════════
export default function HomePage({
  trending = [],
  trendingTV = [],
  loading,
  onSelect,
  progress,
  watched,
  inProgress = [],
  offline,
  onRetry,
  onToggleSave,
  isSaved,
  history = [],
  apiKey,
}) {
  const [trendingAnime, setTrendingAnime] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [popularMovies, setPopularMovies] = useState([]);
  const [topRatedMovies, setTopRatedMovies] = useState([]);
  const [popularTV, setPopularTV] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recTitle, setRecTitle] = useState("");
  const [inProgressDetails, setInProgressDetails] = useState({});
  const [heroDetails, setHeroDetails] = useState(null);
  const [heroTrailerKey, setHeroTrailerKey] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState("movies");
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreMovies, setGenreMovies] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);

  // ── Parallel fetch — no sequential waterfall ────────────────────────────
  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;

    Promise.all([
      tmdbFetch("/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1", apiKey),
      tmdbFetch("/movie/popular?page=1", apiKey),
      tmdbFetch("/movie/top_rated?page=1", apiKey),
      tmdbFetch("/tv/popular?page=1", apiKey),
      tmdbFetch("/movie/now_playing?page=1", apiKey),
    ]).then(([anime, pop, top, popTV, nowPlaying]) => {
      if (cancelled) return;
      setTrendingAnime((anime.results || []).slice(0, 14).map((i) => ({ ...i, media_type: "anime" })));
      setPopularMovies((pop.results || []).slice(0, 14).map((i) => ({ ...i, media_type: "movie" })));
      setTopRatedMovies((top.results || []).slice(0, 14).map((i) => ({ ...i, media_type: "movie" })));
      setPopularTV((popTV.results || []).slice(0, 14).map((i) => ({ ...i, media_type: "tv" })));
      setNewReleases((nowPlaying.results || []).slice(0, 14).map((i) => ({ ...i, media_type: "movie" })));
    }).catch((e) => console.warn("HomePage fetch failed", e));

    return () => { cancelled = true; };
  }, [apiKey, offline]);

  // ── Recommendations ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;
    const baseItem = history?.[0] || null;
    const fallback = { id: 27205, type: "movie", title: "Inception" };

    if (baseItem) {
      const type = baseItem.media_type === "anime" ? "tv" : baseItem.media_type || "movie";
      tmdbFetch(`/${type}/${baseItem.id}/recommendations?page=1`, apiKey)
        .then((d) => {
          if (cancelled) return;
          setRecommendations((d.results || []).slice(0, 14).map((i) => ({ ...i, media_type: i.media_type || "movie" })));
          setRecTitle(baseItem.title || baseItem.name);
        }).catch(() => {});
    } else {
      setRecTitle(fallback.title);
      tmdbFetch(`/movie/${fallback.id}/recommendations?page=1`, apiKey)
        .then((d) => {
          if (cancelled) return;
          setRecommendations((d.results || []).slice(0, 14).map((i) => ({ ...i, media_type: "movie" })));
        }).catch(() => {});
    }

    return () => { cancelled = true; };
  }, [history, apiKey, offline]);

  // ── Continue Watching backdrops ─────────────────────────────────────────
  useEffect(() => {
    if (!apiKey || offline || !inProgress?.length) return;
    let cancelled = false;
    const items = inProgress.slice(0, 6);

    Promise.all(
      items.map((item) => {
        const type = item.media_type === "anime" ? "tv" : item.media_type || "movie";
        return tmdbFetch(`/${type}/${item.id}`, apiKey).then((d) => [item, d]).catch(() => [item, null]);
      })
    ).then((pairs) => {
      if (cancelled) return;
      const map = {};
      pairs.forEach(([item, d]) => {
        if (d) map[`${item.media_type}_${item.id}`] = d;
      });
      setInProgressDetails((prev) => ({ ...prev, ...map }));
    });

    return () => { cancelled = true; };
  }, [inProgress, apiKey, offline]);

  // ── Genre discovery ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedGenre || !apiKey || offline) { setGenreMovies([]); return; }
    let cancelled = false;
    setGenreLoading(true);

    tmdbFetch(`/discover/movie?with_genres=${selectedGenre.id}&page=1`, apiKey)
      .then((d) => {
        if (cancelled) return;
        setGenreMovies((d.results || []).slice(0, 14).map((i) => ({ ...i, media_type: "movie" })));
      }).catch(() => {})
      .finally(() => { if (!cancelled) setGenreLoading(false); });

    return () => { cancelled = true; };
  }, [selectedGenre, apiKey, offline]);

  const trendingMovies = useMemo(
    () => trending.slice(0, 14).map((i) => ({ ...i, media_type: "movie" })),
    [trending]
  );
  const trendingSeries = useMemo(
    () => trendingTV.slice(0, 14).map((i) => ({ ...i, media_type: "tv" })),
    [trendingTV]
  );

  // Hero carousel
  const heroItems = useMemo(() => [
    ...trendingMovies.slice(0, 5),
    ...trendingSeries.slice(0, 4),
    ...trendingAnime.slice(0, 3),
  ].filter(Boolean), [trendingMovies, trendingSeries, trendingAnime]);

  useEffect(() => {
    if (heroItems.length < 2) return;
    const id = setInterval(() => {
      setActiveHeroIndex((c) => (c + 1) % heroItems.length);
    }, 10000);
    return () => clearInterval(id);
  }, [heroItems.length]);

  const hero = heroItems[activeHeroIndex] || heroItems[0] || null;

  // Hero trailer fetch
  useEffect(() => {
    if (!hero || !apiKey || offline) { setHeroDetails(null); setHeroTrailerKey(null); return; }
    let cancelled = false;
    const mediaType = hero.media_type === "anime" ? "tv" : (hero.media_type || "movie");

    tmdbFetch(`/${mediaType}/${hero.id}?append_to_response=videos`, apiKey)
      .then((d) => {
        if (cancelled) return;
        setHeroDetails(d);
        const trailer = d.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube")
          || d.videos?.results?.find((v) => v.site === "YouTube");
        setHeroTrailerKey(trailer?.key || null);
      }).catch(() => {});

    return () => { cancelled = true; };
  }, [hero?.id, apiKey, offline]);

  const categoryTabItems = useMemo(() => {
    if (activeCategoryTab === "tvshows") return trendingSeries;
    if (activeCategoryTab === "anime") return trendingAnime;
    return trendingMovies;
  }, [activeCategoryTab, trendingMovies, trendingSeries, trendingAnime]);

  // Continue watching scroll
  const cwRef = useRef(null);
  const scrollCW = useCallback((dir) => {
    cwRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  }, []);

  const rowProps = { onSelect, progress, watched, onToggleSave, isSaved };

  return (
    <div className="neo-home">

      {/* HERO */}
      {hero && (
        <div className="neo-home__hero-shell">
          <HeroBanner
            item={hero}
            isSaved={isSaved?.(hero)}
            onPlay={() => onSelect?.(hero)}
            onToggleSave={() => onToggleSave?.(hero)}
            onMoreInfo={() => onSelect?.(hero)}
            isAnime={hero.media_type === "anime"}
          />
        </div>
      )}

      {/* TOP 10 */}
      {!offline && <Top10Row items={trendingMovies} onSelect={onSelect} />}

      {/* CONTINUE WATCHING */}
      {inProgress?.length > 0 && (
        <div className="neo-section">
          <div className="neo-section__header">
            <h2 className="neo-section__title">Continue Watching</h2>
            <span className="neo-section__badge">{inProgress.length} IN PROGRESS</span>
          </div>
          <div className="neo-row">
            <button className="neo-row__btn neo-row__btn--left" onClick={() => scrollCW("left")} aria-label="Scroll left">‹</button>
            <div className="neo-row__track" ref={cwRef} style={{ overflowY: "visible" }}>
              {inProgress.slice(0, 10).map((item) => {
                const k = item._pk;
                const pct = progress[k] || 0;
                const cid = `${item.media_type}_${item.id}`;
                return (
                  <div key={k} className="neo-row__item" style={{ overflow: "visible" }}>
                    <ContinueWatchingCard
                      item={item}
                      progress={pct}
                      onClick={() => onSelect?.(item)}
                      details={inProgressDetails[cid]}
                    />
                  </div>
                );
              })}
            </div>
            <button className="neo-row__btn neo-row__btn--right" onClick={() => scrollCW("right")} aria-label="Scroll right">›</button>
          </div>
        </div>
      )}

      {/* TRENDING ROWS */}
      {!offline && (
        <>
          <NeoRow title="Trending Movies" items={trendingMovies} badge="HOT" {...rowProps} />
          <NeoRow title="Popular TV Shows" items={popularTV} {...rowProps} />
          <NeoRow title="Trending Anime" items={trendingAnime} badge="ANIME" {...rowProps} />
        </>
      )}

      {/* CATEGORY TABS */}
      {!offline && (
        <div className="neo-section">
          <div className="neo-section__header">
            <h2 className="neo-section__title">Browse Trending</h2>
          </div>
          <CategoryTabs active={activeCategoryTab} onChange={setActiveCategoryTab} />
          {/* CSS opacity transition — no Framer Motion AnimatePresence */}
          <NeoRow
            key={activeCategoryTab}
            title=""
            items={categoryTabItems}
            {...rowProps}
          />
        </div>
      )}

      {/* TOP RATED & POPULAR */}
      {!offline && (
        <>
          <NeoRow title="Top Rated Movies" items={topRatedMovies} badge="★" {...rowProps} />
          <NeoRow title="New Releases" items={newReleases} badge="NEW" {...rowProps} />
          {recommendations.length > 0 && (
            <NeoRow title={recTitle ? `Because You Watched: ${recTitle}` : "Recommended for You"} items={recommendations} badge="PICK" {...rowProps} />
          )}
        </>
      )}

      {/* GENRE GRID */}
      {!offline && (
        <>
          <GenreGrid onGenreSelect={setSelectedGenre} />

          {selectedGenre && (
            <div className="neo-section">
              <div className="neo-section__header">
                <h2 className="neo-section__title">
                  {selectedGenre.name} Movies
                </h2>
                <button
                  onClick={() => setSelectedGenre(null)}
                  style={{
                    marginLeft: "auto",
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#fff",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <CloseIcon />
                </button>
              </div>
              {genreLoading ? (
                <div className="neo-skeleton-row">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="neo-skeleton-card">
                      <div className="neo-skeleton neo-skeleton-card__poster" />
                      <div className="neo-skeleton neo-skeleton-card__title" />
                    </div>
                  ))}
                </div>
              ) : (
                <NeoRow title="" items={genreMovies} {...rowProps} />
              )}
            </div>
          )}
        </>
      )}

      {/* TRAILER MODAL */}
      {showTrailer && heroTrailerKey && (
        <TrailerModal
          trailerKey={heroTrailerKey}
          title={hero?.title || hero?.name}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </div>
  );
}
