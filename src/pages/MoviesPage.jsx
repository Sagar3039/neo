import { useState, useEffect, useMemo } from "react";
import Loader from "../components/load";
import SectionRow from "../components/SectionRow";
import { BookmarkFillIcon, BookmarkIcon, PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, tmdbFetch } from "../utils/api";

const CATEGORY_CONFIG = [
  { key: "trending", title: "Trending Movies", path: "/trending/movie/week" },
  { key: "popular", title: "Popular Movies", path: "/movie/popular?page=1" },
  { key: "topRated", title: "Top Rated Movies", path: "/movie/top_rated?page=1" },
  { key: "action", title: "Action Movies", path: "/discover/movie?with_genres=28&page=1" },
  { key: "comedy", title: "Comedy Movies", path: "/discover/movie?with_genres=35&page=1" },
  { key: "horror", title: "Horror Movies", path: "/discover/movie?with_genres=27&page=1" },
  { key: "sciFi", title: "Sci-Fi Movies", path: "/discover/movie?with_genres=878&page=1" },
  { key: "newReleases", title: "New Releases", path: "/movie/now_playing?page=1" },
];

function MovieSpotlightHero({ hero, items = [], onSelect, onToggleSave, isSaved }) {
  const title = hero?.title || hero?.name || "Featured Movie";
  const year = (hero?.release_date || hero?.first_air_date || "").slice(0, 4);
  const rating = hero?.vote_average ? hero.vote_average.toFixed(1) : null;
  const heroArt = hero?.backdrop_path || hero?.poster_path;
  const posterWall = items.slice(1, 7);

  return (
    <section className="movie-showcase-hero">
      {heroArt && (
        <div
          className="movie-showcase-hero__backdrop"
          style={{ backgroundImage: `url(${imgUrl(heroArt, "original")})` }}
        />
      )}
      <div className="movie-showcase-hero__grain" />
      <div className="movie-showcase-hero__content">
        <p className="movie-showcase-hero__eyebrow">Now Playing</p>
        <h1>{title}</h1>
        <div className="movie-showcase-hero__meta">
          {rating && (
            <span>
              <StarIcon size={15} />
              {rating}
            </span>
          )}
          {year && <span>{year}</span>}
          <span>Cinematic Feature</span>
        </div>
        {hero?.overview && <p className="movie-showcase-hero__overview">{hero.overview}</p>}
        <div className="movie-showcase-hero__actions">
          <button className="movie-showcase-hero__button movie-showcase-hero__button--play" onClick={() => onSelect?.(hero)}>
            <PlayIcon />
            Play
          </button>
          <button className="movie-showcase-hero__button" onClick={() => onToggleSave?.(hero)}>
            {isSaved?.(hero) ? <BookmarkFillIcon /> : <BookmarkIcon />}
            My List
          </button>
        </div>
      </div>

      <div className="movie-showcase-hero__stage">
        {hero?.poster_path && (
          <button className="movie-showcase-hero__poster movie-showcase-hero__poster--main" onClick={() => onSelect?.(hero)}>
            <img src={imgUrl(hero.poster_path, "w500")} alt="" />
          </button>
        )}
        <div className="movie-showcase-hero__poster-wall">
          {posterWall.map((item, index) => (
            item.poster_path ? (
              <button
                key={item.id}
                className="movie-showcase-hero__poster movie-showcase-hero__poster--tile"
                style={{ ['--delay']: `${index * 90}ms` }}
                onClick={() => onSelect?.(item)}
              >
                <img src={imgUrl(item.poster_path, "w342")} alt="" />
              </button>
            ) : null
          ))}
        </div>
      </div>
    </section>
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

  useEffect(() => {
    if (!apiKey || offline) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const fetches = CATEGORY_CONFIG.map((config) => tmdbFetch(config.path, apiKey));
        const results = await Promise.all(fetches);
        if (cancelled) return;
        const next = {};
        CATEGORY_CONFIG.forEach((config, index) => {
          next[config.key] = (results[index].results || []).slice(0, 12).map((item) => ({ ...item, media_type: "movie" }));
        });
        setSections(next);
        setHero(next.trending?.[0] || next.popular?.[0] || null);
      } catch (e) {
        console.warn("MoviesPage load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiKey, offline]);

  useEffect(() => {
    if (!apiKey || offline || !history?.length) return;
    const movieHistory = history.filter((item) => item.media_type === "movie");
    if (!movieHistory.length) return;
    let cancelled = false;

    async function loadRecommendations() {
      const sources = movieHistory.slice(0, 3);
      const arrays = await Promise.all(
        sources.map(async (source) => {
          try {
            const data = await tmdbFetch(`/movie/${source.id}/recommendations`, apiKey);
            return (data.results || []).map((item) => ({ ...item, media_type: "movie" }));
          } catch {
            return [];
          }
        }),
      );
      if (cancelled) return;
      const dedup = [];
      const seen = new Set();
      arrays.flat().forEach((item) => {
        const key = `${item.media_type}_${item.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedup.push(item);
        }
      });
      setRecommended(dedup.slice(0, 12));
    }

    loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, [apiKey, history, offline]);

  const topPicks = useMemo(() => {
    if (recommended.length > 0) return recommended;
    return sections.popular || [];
  }, [recommended, sections.popular]);

  return (
    <>
      {hero && (
        <MovieSpotlightHero
          hero={hero}
          items={sections.trending || []}
          onSelect={onSelect}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
      )}

      <div className="page-shell movies-page-shell">
        <div className="page-header movies-page-header">
          <div>
            <p className="page-eyebrow">Movies</p>
            <h1 className="page-title">Cinema-grade browsing for every title.</h1>
          </div>
        </div>

        <div className="page-sections">
        {loading && (
          <div className="page-loading">
            <Loader />
          </div>
        )}
        <SectionRow
          title="Trending Movies"
          items={sections.trending}
          className="movies-feature-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Popular Movies"
          items={sections.popular}
          className="movies-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Top Rated Movies"
          items={sections.topRated}
          className="movies-standard-row movies-gold-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Action Movies"
          items={sections.action}
          className="movies-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Comedy Movies"
          items={sections.comedy}
          className="movies-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Horror Movies"
          items={sections.horror}
          className="movies-standard-row movies-horror-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Sci-Fi Movies"
          items={sections.sciFi}
          className="movies-standard-row movies-sci-fi-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="New Releases"
          items={sections.newReleases}
          className="movies-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Recommended Movies"
          items={topPicks}
          className="movies-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
      </div>
    </div>
  </>
  );
}
