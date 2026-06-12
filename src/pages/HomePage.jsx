import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { tmdbFetch, imgUrl } from "../utils/api";
import TrailerModal from "../components/TrailerModal";
import HeroBanner from "../components/HeroBanner";
import Loader from "../components/load";
import {
  PlayIcon,
  BookmarkIcon,
  BookmarkFillIcon,
  CloseIcon,
  WatchedIcon,
  StarIcon,
} from "../components/Icons";

const ANIME_PATH = "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1";
const POPULAR_MOVIES = "/movie/popular?page=1";
const TOP_RATED_MOVIES = "/movie/top_rated?page=1";
const POPULAR_TV = "/tv/popular?page=1";

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const GENRE_CARDS = [
  { id: 28, name: "Action", bg: "/7zoHgR1Xgjo6N3NDRt549t0vup9.jpg" },
  { id: 27, name: "Horror", bg: "/532GOj2wgaR08QEU6aZ74154U5s.jpg" },
  { id: 878, name: "Sci-Fi", bg: "/xJHokZbljvjC4nQ61ZcAADfgZPr.jpg" },
  { id: 35, name: "Comedy", bg: "/nMKdUU5685iGShpy79Y956jn2y9.jpg" },
  { id: 80, name: "Crime", bg: "/9Ke74JCEgl4Ubjls6gx07h6t1Y5.jpg" },
  { id: 14, name: "Fantasy", bg: "/zG0qZ2n6Ty4Q2HUXz3hN11Z3Q2.jpg" },
  { id: 10749, name: "Romance", bg: "/ggNt5d66rSVEwJ9XQ31S8ZJ8H55.jpg" },
  { id: 12, name: "Adventure", bg: "/8Y43oiuiILqDsaqqvUwf4j596tU.jpg" },
];

function getGenreNames(genreIds = []) {
  return genreIds.map((id) => GENRE_MAP[id]).filter(Boolean);
}

// Lightweight card carousel (replaces styled-components example)
function CardCarousel({ items = [] }) {
  const colours = [
    "142, 249, 252",
    "142, 252, 204",
    "142, 252, 157",
    "215, 252, 142",
    "252, 252, 142",
    "252, 208, 142",
    "252, 142, 142",
    "252, 142, 239",
    "204, 142, 252",
    "142, 202, 252",
  ];

  const quantity = Math.min(items.length, 10);

  return (
    <section className="section-row card-carousel-section">
      <div className="premium-section-header">
        <h2>Featured Cards</h2>
        <span className="premium-section-header__badge">Showcase</span>
      </div>
      <div className="card-wrapper">
        <div className="card-inner" style={{ ['--quantity']: quantity }}>
          {Array.from({ length: quantity }).map((_, i) => {
            const movie = items[i] || {};
            const color = colours[i % colours.length];
            const poster = movie.poster_path ? imgUrl(movie.poster_path, "w342") : null;
            const offset = i - (quantity - 1) / 2;
            const distanceFromCenter = Math.abs(offset);
            return (
              <div
                key={movie.id || i}
                className="card"
                style={{
                  ['--index']: i,
                  ['--color-card']: color,
                  ['--x']: `${offset * 88}px`,
                  ['--mobile-x']: `${offset * 64}px`,
                  ['--rotate']: `${offset * -6}deg`,
                  ['--compact-rotate']: `${offset * -4}deg`,
                  ['--hover-rotate']: `${offset * -2}deg`,
                  ['--mobile-hover-rotate']: `${offset * -1.5}deg`,
                  ['--scale']: Math.max(0.82, 1 - distanceFromCenter * 0.035),
                  ['--z']: quantity - Math.round(distanceFromCenter),
                }}
                onClick={() => movie && movie.id && (window.location.hash = `#/movie/${movie.id}`)}
              >
                <div
                  className="img"
                  style={poster ? { backgroundImage: `url(${poster})` } : { background: 'rgba(255,255,255,0.03)' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PREMIUM HOVER MEDIA CARD COMPONENT
// ──────────────────────────────────────────────────────────────────────────
function PremiumCard({
  item,
  onClick,
  progress,
  watched,
  onToggleSave,
  isSavedProp,
  isNew,
  isSoon,
  countdownText,
}) {
  const [hovered, setHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHovered(true);
    }, 350); // slight hover delay like Netflix
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const isTV = item.media_type === "tv" || !!item.first_air_date;
  const isSaved = !!isSavedProp;

  const watchedKey = isTV
    ? item.season != null && item.episode != null
      ? `tv_${item.id}_s${item.season}e${item.episode}`
      : `tv_${item.id}`
    : `movie_${item.id}`;

  const isWatched = !!watched?.[watchedKey];
  const genreNames = getGenreNames(item.genre_ids || []).slice(0, 2);
  const matchPct = 88 + (item.id % 12);

  return (
    
    <div
      className="premium-card"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ position: "relative" }}
    >
      <div className="premium-card__poster">
        {item.poster_path ? (
          <img
            src={imgUrl(item.poster_path, "w342")}
            alt={title}
            loading="lazy"
          />
        ) : (
          <div className="no-poster">
            <span style={{ fontSize: 11 }}>No Poster</span>
          </div>
        )}

        {isSoon && (
          <div className="premium-card__badge-soon">
            {countdownText || "SOON"}
          </div>
        )}

        {isNew && <div className="premium-card__badge-new">NEW</div>}

        {progress > 0 && !isWatched && (
          <div className="card-progress">
            <div
              className="card-progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        {isWatched && (
          <div className="card-watched-badge" style={{ transform: "scale(0.8)", right: 8, bottom: 8, position: "absolute" }}>
            <WatchedIcon size={22} />
          </div>
        )}
      </div>
      <div className="premium-card__info">
        <div className="premium-card__title" title={title}>
          {title}
        </div>
        <div className="premium-card__meta">
          {year ? `${year} • ` : ""}{isTV ? "Series" : "Movie"}
        </div>
      </div>

      <AnimatePresence>
        {hovered && !isSoon && (
          <motion.div
            className="premium-card__hover-panel"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="premium-card__hover-backdrop"
              style={{
                backgroundImage: `url(${imgUrl(
                  item.backdrop_path || item.poster_path,
                  "w500"
                )})`,
              }}
              onClick={onClick}
            >
              <div className="card-overlay" style={{ opacity: 1 }}>
                <div className="card-play" style={{ transform: "scale(0.8)" }}>
                  <PlayIcon />
                </div>
              </div>
            </div>
            <div className="premium-card__hover-details">
              <div className="premium-card__hover-actions">
                <button
                  className="premium-card__hover-btn"
                  onClick={onClick}
                  title="Play"
                >
                  <PlayIcon />
                </button>
                <button
                  className="premium-card__hover-btn premium-card__hover-btn--secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave?.();
                  }}
                  title={isSaved ? "Remove from List" : "Add to List"}
                >
                  {isSaved ? <BookmarkFillIcon /> : <BookmarkIcon />}
                </button>
              </div>
              <div className="premium-card__hover-title">{title}</div>
              <div className="premium-card__hover-row2">
                <span className="premium-card__hover-match">
                  {matchPct}% Match
                </span>
                <span className="premium-card__hover-rating">HD</span>
                {year && (
                  <span className="premium-card__hover-year">{year}</span>
                )}
              </div>
              {genreNames.length > 0 && (
                <div className="premium-card__hover-genres">
                  {genreNames.map((g, idx) => (
                    <span key={idx}>{g}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// PREMIUM CONTENT ROW SLIDER COMPONENT
// ──────────────────────────────────────────────────────────────────────────
function PremiumSectionRow({
  title,
  items = [],
  onSelect,
  progress,
  watched,
  onToggleSave,
  isSaved,
  badge = null,
  isSoon = false,
  countdownFn = null,
}) {
  const scrollContainerRef = useRef(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 260; // card size + gap
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="section-row" style={{ overflow: "visible" }}>
      <div className="premium-section-header">
        <h2>{title}</h2>
        {badge && <span className="premium-section-header__badge">{badge}</span>}
      </div>
      <div className="section-row__wrapper" style={{ overflow: "visible" }}>
        <button
          className="section-row__scroll-btn section-row__scroll-btn--left"
          onClick={() => handleScroll("left")}
          aria-label="Scroll left"
          style={{ height: "100%", zIndex: 10 }}
        >
          ‹
        </button>
        <div
          className="section-row__cards"
          ref={scrollContainerRef}
          style={{
            overflowY: "visible",
            padding: "10px 0 25px",
            marginTop: "-10px",
            marginBottom: "-25px",
          }}
        >
          {items.map((item, idx) => {
            const countdownText = isSoon && countdownFn ? countdownFn(item.release_date) : null;
            return (
              <div
                key={`${item.media_type || (item.first_air_date ? "tv" : "movie")}_${item.id}`}
                className="section-row__card"
                style={{ overflow: "visible" }}
              >
                <PremiumCard
                  item={item}
                  onClick={() => onSelect?.(item)}
                  progress={
                    progress?.[
                    `${item.media_type || (item.first_air_date ? "tv" : "movie")}_${item.id}`
                    ] || 0
                  }
                  watched={watched}
                  onToggleSave={() => onToggleSave?.(item)}
                  isSavedProp={isSaved?.(item)}
                  isNew={!isSoon && idx < 3 && (title.includes("New") || title.includes("Trending"))}
                  isSoon={isSoon}
                  countdownText={countdownText}
                />
              </div>
            );
          })}
        </div>
        <button
          className="section-row__scroll-btn section-row__scroll-btn--right"
          onClick={() => handleScroll("right")}
          aria-label="Scroll right"
          style={{ height: "100%", zIndex: 10 }}
        >
          ›
        </button>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// MAIN HOMEPAGE COMPONENT
// ──────────────────────────────────────────────────────────────────────────
export default function HomePage({
  trending = [],
  trendingTV = [],
  loading,
  onSelect,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
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

  // New section lists
  const [newReleases, setNewReleases] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendations2, setRecommendations2] = useState([]);
  const [recTitle, setRecTitle] = useState("");
  const [recTitle2, setRecTitle2] = useState("");

  // Continue Watching full backdrop details cache
  const [inProgressDetails, setInProgressDetails] = useState({});

  // Active Hero Details & Trailer
  const [heroDetails, setHeroDetails] = useState(null);
  const [heroTrailerKey, setHeroTrailerKey] = useState(null);
  const [showTrailer, setShowTrailer] = useState(false);

  // Tab state (Section 6)
  const [activeCategoryTab, setActiveCategoryTab] = useState("movies");

  // Genre selected discovery modal state (Section 7)
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreMovies, setGenreMovies] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);

  // 1. Fetch Anime & Movies/TV
  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;

    // Anime Fetch
    tmdbFetch(ANIME_PATH, apiKey)
      .then((data) => {
        if (cancelled) return;
        setTrendingAnime(
          (data.results || [])
            .slice(0, 12)
            .map((item) => ({ ...item, media_type: "anime" }))
        );
      })
      .catch((error) => {
        console.warn("HomePage trending anime failed", error);
      });

    // Popular + Top Rated TV/Movie Fetches
    Promise.all([
      tmdbFetch(POPULAR_MOVIES, apiKey),
      tmdbFetch(TOP_RATED_MOVIES, apiKey),
      tmdbFetch(POPULAR_TV, apiKey),
      tmdbFetch("/movie/now_playing?page=1", apiKey), // New releases
      tmdbFetch("/movie/upcoming?page=1", apiKey), // Coming soon
    ])
      .then(([pop, top, popTV, nowPlaying, upcoming]) => {
        if (cancelled) return;
        setPopularMovies(
          (pop.results || [])
            .slice(0, 12)
            .map((item) => ({ ...item, media_type: "movie" }))
        );
        setTopRatedMovies(
          (top.results || [])
            .slice(0, 12)
            .map((item) => ({ ...item, media_type: "movie" }))
        );
        setPopularTV(
          (popTV.results || [])
            .slice(0, 12)
            .map((item) => ({ ...item, media_type: "tv" }))
        );
        setNewReleases(
          (nowPlaying.results || [])
            .slice(0, 12)
            .map((item) => ({ ...item, media_type: "movie" }))
        );
        setComingSoon(
          (upcoming.results || [])
            .slice(0, 12)
            .map((item) => ({ ...item, media_type: "movie" }))
        );
      })
      .catch((err) => {
        console.warn("Home fetches failed", err);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, offline]);

  // 2. Fetch history-based recommendations (Section 5 & Section 10)
  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;

    if (history && history.length > 0) {
      // User history item 1
      const item1 = history[0];
      const type1 = item1.media_type === "anime" ? "tv" : item1.media_type || "movie";
      tmdbFetch(`/${type1}/${item1.id}/recommendations?page=1`, apiKey)
        .then((data) => {
          if (cancelled) return;
          setRecommendations(
            (data.results || [])
              .slice(0, 12)
              .map((item) => ({ ...item, media_type: item.media_type || "movie" }))
          );
          setRecTitle(item1.title || item1.name);
        })
        .catch(() => { });

      // User history item 2
      if (history.length > 1) {
        const item2 = history[1];
        const type2 = item2.media_type === "anime" ? "tv" : item2.media_type || "movie";
        tmdbFetch(`/${type2}/${item2.id}/recommendations?page=1`, apiKey)
          .then((data) => {
            if (cancelled) return;
            setRecommendations2(
              (data.results || [])
                .slice(0, 12)
                .map((item) => ({ ...item, media_type: item.media_type || "movie" }))
            );
            setRecTitle2(item2.title || item2.name);
          })
          .catch(() => { });
      }
    } else {
      // Fallback recommendation based on Inception (popular blockbusters)
      const fallbackId = 27205; // Inception
      setRecTitle("Inception");
      tmdbFetch(`/movie/${fallbackId}/recommendations?page=1`, apiKey)
        .then((data) => {
          if (cancelled) return;
          setRecommendations(
            (data.results || [])
              .slice(0, 12)
              .map((item) => ({ ...item, media_type: "movie" }))
          );
        })
        .catch(() => { });

      // Fallback 2: Stranger Things (TV show fallback)
      const fallbackTVId = 66732;
      setRecTitle2("Stranger Things");
      tmdbFetch(`/tv/${fallbackTVId}/recommendations?page=1`, apiKey)
        .then((data) => {
          if (cancelled) return;
          setRecommendations2(
            (data.results || [])
              .slice(0, 12)
              .map((item) => ({ ...item, media_type: "tv" }))
          );
        })
        .catch(() => { });
    }

    return () => {
      cancelled = true;
    };
  }, [history, apiKey, offline]);

  // 3. Fetch Continue Watching details (backdrops)
  useEffect(() => {
    if (!apiKey || offline || !inProgress || inProgress.length === 0) return;
    let cancelled = false;

    const fetchCWBackdrops = async () => {
      try {
        const detailsMap = {};
        await Promise.all(
          inProgress.slice(0, 6).map(async (item) => {
            const type = item.media_type === "anime" ? "tv" : item.media_type || "movie";
            const data = await tmdbFetch(`/${type}/${item.id}`, apiKey);
            detailsMap[`${item.media_type}_${item.id}`] = data;
          })
        );
        if (!cancelled) {
          setInProgressDetails((prev) => ({ ...prev, ...detailsMap }));
        }
      } catch (err) {
        console.warn("Continue watching details fetch failed", err);
      }
    };

    fetchCWBackdrops();
    return () => {
      cancelled = true;
    };
  }, [inProgress, apiKey, offline]);

  // 4. Genre discovery dynamic row loader
  useEffect(() => {
    if (!selectedGenre || !apiKey || offline) {
      setGenreMovies([]);
      return;
    }
    let cancelled = false;
    setGenreLoading(true);

    tmdbFetch(`/discover/movie?with_genres=${selectedGenre.id}&page=1`, apiKey)
      .then((data) => {
        if (cancelled) return;
        setGenreMovies(
          (data.results || [])
            .slice(0, 12)
            .map((item) => ({ ...item, media_type: "movie" }))
        );
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setGenreLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGenre, apiKey, offline]);

  // Normalize data slices for rows
  const trendingMovies = useMemo(
    () => trending.slice(0, 12).map((item) => ({ ...item, media_type: "movie" })),
    [trending]
  );

  const trendingSeries = useMemo(
    () => trendingTV.slice(0, 12).map((item) => ({ ...item, media_type: "tv" })),
    [trendingTV]
  );

  // Hero carousel contents
  const heroItems = useMemo(() => {
    return [
      ...trendingMovies.slice(0, 4),
      ...trendingSeries.slice(0, 4),
      ...trendingAnime.slice(0, 4),
    ].filter(Boolean);
  }, [trendingMovies, trendingSeries, trendingAnime]);

  // Hero rotate loop
  useEffect(() => {
    if (heroItems.length < 2) return;
    const intervalId = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroItems.length);
    }, 10000); // Rotate every 10 seconds per requirements
    return () => window.clearInterval(intervalId);
  }, [heroItems.length]);

  const hero = heroItems[activeHeroIndex] || heroItems[0] || null;

  // 5. Fetch Active Hero detailed metadata & trailers
  useEffect(() => {
    if (!hero || !apiKey || offline) {
      setHeroDetails(null);
      setHeroTrailerKey(null);
      return;
    }
    let cancelled = false;
    const mediaType = hero.media_type || (hero.first_air_date ? "tv" : "movie");

    tmdbFetch(`/${mediaType}/${hero.id}?append_to_response=videos`, apiKey)
      .then((data) => {
        if (cancelled) return;
        setHeroDetails(data);
        const trailer =
          data.videos?.results?.find(
            (v) => v.type === "Trailer" && v.site === "YouTube"
          ) || data.videos?.results?.find((v) => v.site === "YouTube");
        if (trailer) {
          setHeroTrailerKey(trailer.key);
        } else {
          setHeroTrailerKey(null);
        }
      })
      .catch((err) => {
        console.warn("Failed fetching hero details", err);
      });

    return () => {
      cancelled = true;
    };
  }, [hero?.id, apiKey, offline]);

  // Estimate remaining watch time helper
  const getRemainingTimeText = (item, progressPct) => {
    if (progressPct <= 0 || progressPct >= 100) return null;
    const totalMin = item.media_type === "tv" ? 45 : 120;
    const remainingMin = Math.round(totalMin * (100 - progressPct) / 100);
    if (remainingMin >= 60) {
      const hrs = Math.floor(remainingMin / 60);
      const mins = remainingMin % 60;
      return `${hrs}h ${mins}m left`;
    }
    return `${remainingMin}m left`;
  };

  // Upcoming release date countdown timer
  const getCountdownText = (releaseDate) => {
    if (!releaseDate) return null;
    const release = new Date(releaseDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = release - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Out Now";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `In ${diffDays}d`;
  };

  // Determine active list for Category Tabs (Section 6)
  const categoryTabItems = useMemo(() => {
    if (activeCategoryTab === "tvshows") return trendingSeries;
    if (activeCategoryTab === "anime") return trendingAnime;
    return trendingMovies;
  }, [activeCategoryTab, trendingMovies, trendingSeries, trendingAnime]);

  // Scroll handler for Continue Watching
  const cwScrollRef = useRef(null);
  const handleCwScroll = (direction) => {
    if (!cwScrollRef.current) return;
    cwScrollRef.current.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth",
    });
  };

  return (
    <div className="premium-home-container">
      {/* SECTION 1 — CINEMATIC HERO */}
      {hero && (
              <div className="page-hero-section">
                <div className="page-hero-container">
                  <HeroBanner
                    item={hero}
                    isSaved={isSaved?.(hero)}
                    onPlay={() => onSelect?.(hero)}
                    onToggleSave={() => onToggleSave?.(hero)}
                    onMoreInfo={() => onSelect?.(hero)}
                    isAnime={true}
                  />
                </div>
              </div>
            )}
      
          {/* SECTION 2 — FLOATING FEATURED ROW */}
          {/* SECTION 4 — TOP 10 TODAY */}
          {!offline && trendingMovies.length > 0 && (
            <section className="section-row" style={{ overflow: "visible" }}>
              <div className="premium-section-header">
                <h2>Top 10 Today</h2>
                <span className="premium-section-header__badge">Featured Hits</span>
              </div>
              <div className="top10-row__cards">
                {trendingMovies.slice(0, 10).map((item, index) => (
                  <div
                    key={`top10_${item.id}`}
                    className="top10-card"
                    onClick={() => onSelect?.(item)}
                  >
                    <span className="top10-number">#{index + 1}</span>
                    <div className="top10-poster-wrap">
                      {item.poster_path ? (
                        <img
                          src={imgUrl(item.poster_path, "w342")}
                          alt={item.title || item.name}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="no-poster"
                          style={{ width: "100%", height: "100%" }}
                        >
                          No Image
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 3 — CONTINUE WATCHING */}
          {inProgress && inProgress.length > 0 && (
            <section className="section-row" style={{ overflow: "visible" }}>
              <div className="premium-section-header">
                <h2>Continue Watching</h2>
                <span className="premium-section-header__badge">
                  {inProgress.length} In Progress
                </span>
              </div>
              <div className="section-row__wrapper" style={{ overflow: "visible" }}>
                <button
                  className="section-row__scroll-btn section-row__scroll-btn--left"
                  onClick={() => handleCwScroll("left")}
                  aria-label="Scroll left"
                  style={{ height: "100%", zIndex: 10 }}
                >
                  ‹
                </button>
                <div
                  className="section-row__cards"
                  ref={cwScrollRef}
                  style={{
                    overflowY: "visible",
                    padding: "10px 0 25px",
                    marginTop: "-10px",
                    marginBottom: "-25px",
                  }}
                >
                  {inProgress.slice(0, 10).map((item) => {
                    const key = item._pk;
                    const pct = progress[key] || 0;
                    const remainingText = getRemainingTimeText(item, pct);
                    const cacheId = `${item.media_type}_${item.id}`;
                    const details = inProgressDetails[cacheId];
                    const bgUrl = details?.backdrop_path || item.poster_path;

                    return (
                      <div key={key} className="continue-watching__card">
                        <div className="continue-watching__backdrop">
                          {bgUrl ? (
                            <img
                              src={imgUrl(bgUrl, "w500")}
                              alt={item.title}
                              loading="lazy"
                            />
                          ) : (
                            <div className="no-poster">
                              <span>No Backdrop</span>
                            </div>
                          )}
                          <div className="continue-watching__resume-overlay">
                            <button
                              className="continue-watching__resume-btn"
                              onClick={() => onSelect?.(item)}
                              title="Resume Playback"
                            >
                              <PlayIcon />
                            </button>
                          </div>
                        </div>
                        <div className="continue-watching__info">
                          <div
                            className="continue-watching__title"
                            title={item.title}
                          >
                            {item.title}
                          </div>
                          <div className="continue-watching__episode-info">
                            {item.media_type === "tv" &&
                              item.season != null &&
                              item.episode != null ? (
                              <>
                                Season {item.season} • Episode {item.episode}
                                {item.episodeName ? ` — ${item.episodeName}` : ""}
                              </>
                            ) : (
                              "Resume Movie"
                            )}
                          </div>
                          <div className="continue-watching__progress-wrap">
                            <div
                              className="continue-watching__progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {remainingText && (
                            <div className="continue-watching__remaining-time">
                              {remainingText}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="section-row__scroll-btn section-row__scroll-btn--right"
                  onClick={() => handleCwScroll("right")}
                  aria-label="Scroll right"
                  style={{ height: "100%", zIndex: 10 }}
                >
                  ›
                </button>
              </div>
            </section>
          )}

          {/* SECTION 6 — TRENDING CATEGORIES TABS */}
          {!offline && (
            <section className="section-row" style={{ overflow: "visible" }}>
              <div className="category-tabs__container">
                <div className="category-tabs">
                  <button
                    className={`category-tab ${activeCategoryTab === "movies" ? "category-tab--active" : ""
                      }`}
                    onClick={() => setActiveCategoryTab("movies")}
                  >
                    Movies
                    {activeCategoryTab === "movies" && (
                      <motion.div
                        layoutId="categoryUnderline"
                        className="category-tab__underline"
                      />
                    )}
                  </button>
                  <button
                    className={`category-tab ${activeCategoryTab === "tvshows" ? "category-tab--active" : ""
                      }`}
                    onClick={() => setActiveCategoryTab("tvshows")}
                  >
                    TV Shows
                    {activeCategoryTab === "tvshows" && (
                      <motion.div
                        layoutId="categoryUnderline"
                        className="category-tab__underline"
                      />
                    )}
                  </button>
                  <button
                    className={`category-tab ${activeCategoryTab === "anime" ? "category-tab--active" : ""
                      }`}
                    onClick={() => setActiveCategoryTab("anime")}
                  >
                    Anime
                    {activeCategoryTab === "anime" && (
                      <motion.div
                        layoutId="categoryUnderline"
                        className="category-tab__underline"
                      />
                    )}
                  </button>
                </div>
              </div>

              <div style={{ overflow: "visible" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCategoryTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    style={{ overflow: "visible" }}
                  >
                    <PremiumSectionRow
                      title={`Trending ${activeCategoryTab === "Anime"
                        ? "Anime"
                        : activeCategoryTab === "tvshows"
                          ? "TV Shows"
                          : "Movies"
                        }`}
                      items={categoryTabItems}
                      onSelect={onSelect}
                      progress={progress}
                      watched={watched}
                      onToggleSave={onToggleSave}
                      isSaved={isSaved}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </section>
          )}


          {/* Insert CardCarousel showing popular movies */}
          {!offline && popularMovies.length > 0 && (
            <CardCarousel items={trendingAnime} />
          )}


         

          {/* SECTION 7 — GENRE DISCOVERY */}
          {!offline && (
            <section className="section-row">
              <div className="premium-section-header">
                <h2>Browse by Genre</h2>
                <span className="premium-section-header__badge">Categories</span>
              </div>
              <div className="genre-grid">
                {GENRE_CARDS.map((g) => (
                  <div
                    key={g.id}
                    className="genre-card"
                    onClick={() => setSelectedGenre(g)}
                  >
                    <div
                      className="genre-card__bg"
                      style={{ backgroundImage: `url(${imgUrl(g.bg, "w500")})` }}
                    />
                    <div className="genre-card__overlay" />
                    <span className="genre-card__title">{g.name}</span>
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {selectedGenre && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "visible", marginTop: 16 }}
                  >
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: 12,
                        padding: "20px 0",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        position: "relative",
                        overflow: "visible",
                      }}
                    >
                      <button
                        onClick={() => setSelectedGenre(null)}
                        style={{
                          position: "absolute",
                          top: 18,
                          right: 18,
                          background: "rgba(255,255,255,0.08)",
                          border: "none",
                          color: "#fff",
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          zIndex: 12,
                        }}
                        title="Close Category"
                      >
                        <CloseIcon />
                      </button>
                      {genreLoading ? (
                        <div
                          className="page-loading"
                          style={{ minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Loader />
                        </div>
                      ) : (
                        <PremiumSectionRow
                          title={`Discover ${selectedGenre.name}`}
                          items={genreMovies}
                          onSelect={onSelect}
                          progress={progress}
                          watched={watched}
                          onToggleSave={onToggleSave}
                          isSaved={isSaved}
                        />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

         
          

      {/* Hero Official Trailer Modal hook */}
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
