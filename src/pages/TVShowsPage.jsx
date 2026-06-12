import { useState, useEffect, useMemo } from "react";
import Loader from "../components/load";
import SectionRow from "../components/SectionRow";
import { BookmarkFillIcon, BookmarkIcon, PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, tmdbFetch } from "../utils/api";

const CATEGORY_CONFIG = [
  { key: "trending", title: "Trending TV Shows", path: "/trending/tv/week" },
  { key: "popular", title: "Popular TV Shows", path: "/tv/popular?page=1" },
  { key: "topRated", title: "Top Rated TV Shows", path: "/tv/top_rated?page=1" },
  { key: "drama", title: "Drama Series", path: "/discover/tv?with_genres=18&page=1" },
  { key: "crime", title: "Crime Series", path: "/discover/tv?with_genres=80&page=1" },
  { key: "thriller", title: "Thriller Series", path: "/discover/tv?with_genres=53&page=1" },
  { key: "comedy", title: "Comedy Series", path: "/discover/tv?with_genres=35&page=1" },
];

function TVStudioHero({ hero, items = [], onSelect, onToggleSave, isSaved }) {
  const title = hero?.name || hero?.title || "Featured Series";
  const year = (hero?.first_air_date || hero?.release_date || "").slice(0, 4);
  const rating = hero?.vote_average ? hero.vote_average.toFixed(1) : null;
  const backdrop = hero?.backdrop_path || hero?.poster_path;
  const stackItems = items.slice(0, 5).reverse();

  return (
    <section className="tv-studio-hero">
      {backdrop && (
        <div
          className="tv-studio-hero__backdrop"
          style={{ backgroundImage: `url(${imgUrl(backdrop, "original")})` }}
        />
      )}
      <div className="tv-studio-hero__wash" />

      <div className="tv-studio-hero__screens">
        {stackItems.map((item, index) => {
          const image = item.backdrop_path || item.poster_path;
          if (!image) return null;
          return (
            <button
              key={item.id}
              className="tv-studio-hero__screen"
              style={{ ['--screen-index']: index }}
              onClick={() => onSelect?.(item)}
            >
              <span style={{ backgroundImage: `url(${imgUrl(image, "w780")})` }} />
            </button>
          );
        })}
      </div>

      <div className="tv-studio-hero__content">
        <p className="tv-studio-hero__eyebrow">Series Spotlight</p>
        <h1>{title}</h1>
        <div className="tv-studio-hero__meta">
          {rating && (
            <span>
              <StarIcon size={15} />
              {rating}
            </span>
          )}
          {year && <span>{year}</span>}
          <span>Premium Series</span>
        </div>
        {hero?.overview && <p className="tv-studio-hero__overview">{hero.overview}</p>}
        <div className="tv-studio-hero__actions">
          <button className="tv-studio-hero__button tv-studio-hero__button--play" onClick={() => onSelect?.(hero)}>
            <PlayIcon />
            Start Watching
          </button>
          <button className="tv-studio-hero__button" onClick={() => onToggleSave?.(hero)}>
            {isSaved?.(hero) ? <BookmarkFillIcon /> : <BookmarkIcon />}
            My List
          </button>
        </div>
      </div>
    </section>
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

    async function load() {
      try {
        const fetches = CATEGORY_CONFIG.map((config) => tmdbFetch(config.path, apiKey));
        const results = await Promise.all(fetches);
        if (cancelled) return;
        const next = {};
        CATEGORY_CONFIG.forEach((config, index) => {
          next[config.key] = (results[index].results || []).slice(0, 12).map((item) => ({ ...item, media_type: "tv" }));
        });
        setSections(next);
        setHero(next.trending?.[0] || next.popular?.[0] || null);
      } catch (e) {
        console.warn("TVShowsPage load failed", e);
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
    const tvHistory = history.filter((item) => item.media_type === "tv");
    if (!tvHistory.length) return;
    let cancelled = false;

    async function loadRecommendations() {
      const sources = tvHistory.slice(0, 3);
      const arrays = await Promise.all(
        sources.map(async (source) => {
          try {
            const data = await tmdbFetch(`/tv/${source.id}/recommendations`, apiKey);
            return (data.results || []).map((item) => ({ ...item, media_type: "tv" }));
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
        <TVStudioHero
          hero={hero}
          items={sections.trending || []}
          onSelect={onSelect}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
      )}

      <div className="page-shell tv-page-shell">
        <div className="page-header tv-page-header">
          <div>
            <p className="page-eyebrow">TV Shows</p>
            <h1 className="page-title">Binge every season with premium curation.</h1>
          </div>
        </div>

        <div className="page-sections">
        {loading && (
          <div className="page-loading">
            <Loader />
          </div>
        )}
        <SectionRow
          title="Trending TV Shows"
          items={sections.trending}
          className="tv-feature-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Popular TV Shows"
          items={sections.popular}
          className="tv-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Top Rated TV Shows"
          items={sections.topRated}
          className="tv-standard-row tv-prestige-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Drama Series"
          items={sections.drama}
          className="tv-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Crime Series"
          items={sections.crime}
          className="tv-standard-row tv-crime-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Thriller Series"
          items={sections.thriller}
          className="tv-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Comedy Series"
          items={sections.comedy}
          className="tv-standard-row"
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Recommended Shows"
          items={topPicks}
          className="tv-standard-row"
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
