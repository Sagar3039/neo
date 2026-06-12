import { useState, useEffect, useMemo } from "react";

import Loader from "../components/load";
import SectionRow from "../components/SectionRow";
import { BookmarkFillIcon, BookmarkIcon, PlayIcon, StarIcon } from "../components/Icons";
import { imgUrl, tmdbFetch } from "../utils/api";

const CATEGORY_CONFIG = [
  { key: "trending", title: "Trending Anime", path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "newReleases", title: "New Anime", path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=first_air_date.desc&page=1" },
  { key: "topRated", title: "Top Rated Anime", path: "/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&page=1" },
  { key: "action", title: "Action Anime", path: "/discover/tv?with_genres=16,28&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "fantasy", title: "Fantasy Anime", path: "/discover/tv?with_genres=16,14&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "romance", title: "Romance Anime", path: "/discover/tv?with_genres=16,10749&with_original_language=ja&sort_by=popularity.desc&page=1" },
  { key: "shounen", title: "Shounen Favorites", path: "/discover/tv?with_genres=16,35&with_original_language=ja&sort_by=popularity.desc&page=1" },
];

function AnimeCarouselBanner({ items = [], featured, onSelect, onToggleSave, isSaved }) {
  const colours = [
    "142, 249, 252",
    "142, 252, 204",
    "215, 252, 142",
    "252, 208, 142",
    "252, 142, 142",
    "252, 142, 239",
    "204, 142, 252",
    "142, 202, 252",
  ];

  const carouselItems = items.slice(0, 9);
  const title = featured?.name || featured?.title || "Anime";
  const year = (featured?.first_air_date || featured?.release_date || "").slice(0, 4);
  const rating = featured?.vote_average ? featured.vote_average.toFixed(1) : null;
  const backdrop = featured?.backdrop_path || featured?.poster_path;

  return (
    <section className="anime-banner">
      {backdrop && (
        <div
          className="anime-banner__backdrop"
          style={{ backgroundImage: `url(${imgUrl(backdrop, "original")})` }}
        />
      )}
      <div className="anime-banner__shade" />

      <div className="anime-banner__content">
        <p className="anime-banner__eyebrow">Anime Showcase</p>
        <h1 className="anime-banner__title">{title}</h1>
        <div className="anime-banner__meta">
          {rating && (
            <span className="anime-banner__rating">
              <StarIcon size={15} />
              {rating}
            </span>
          )}
          {year && <span>{year}</span>}
          <span>Series</span>
        </div>
        {featured?.overview && (
          <p className="anime-banner__overview">{featured.overview}</p>
        )}
        <div className="anime-banner__actions">
          <button className="anime-banner__button anime-banner__button--play" onClick={() => onSelect?.(featured)}>
            <PlayIcon />
            Play
          </button>
          <button className="anime-banner__button" onClick={() => onToggleSave?.(featured)}>
            {isSaved?.(featured) ? <BookmarkFillIcon /> : <BookmarkIcon />}
            My List
          </button>
        </div>
      </div>

      <div className="anime-banner__carousel" aria-label="Featured anime carousel">
        <div className="anime-banner__carousel-inner" style={{ ['--quantity']: carouselItems.length }}>
          {carouselItems.map((anime, i) => {
            const offset = i - (carouselItems.length - 1) / 2;
            const distanceFromCenter = Math.abs(offset);
            const poster = anime.poster_path ? imgUrl(anime.poster_path, "w500") : null;

            return (
              <button
                key={anime.id || i}
                className="anime-banner__card"
                style={{
                  ['--color-card']: colours[i % colours.length],
                  ['--x']: `${offset * 126}px`,
                  ['--mobile-x']: `${offset * 72}px`,
                  ['--rotate']: `${offset * -6}deg`,
                  ['--compact-rotate']: `${offset * -4}deg`,
                  ['--hover-rotate']: `${offset * -1.5}deg`,
                  ['--scale']: Math.max(0.78, 1 - distanceFromCenter * 0.032),
                  ['--z']: carouselItems.length - Math.round(distanceFromCenter),
                }}
                onClick={() => onSelect?.(anime)}
                aria-label={`Open ${anime.name || anime.title || "anime"}`}
              >
                <span
                  className="anime-banner__poster"
                  style={poster ? { backgroundImage: `url(${poster})` } : { background: "rgba(255,255,255,0.05)" }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
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
        setHero(next.topRated?.[0] || next.topRated?.[0] || null);
      } catch (e) {
        console.warn("AnimePage load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [apiKey, offline]);

  return (
    <>
      {hero && (
        <AnimeCarouselBanner
          items={sections.topRated || []}
          featured={hero}
          onSelect={onSelect}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
      )}

      <div className="page-shell anime-page-shell">

        <div className="page-sections">
        {loading && (
          <div className="page-loading">
            <Loader />
          </div>
        )}
        
        <SectionRow
          title="Trending Anime"
          items={sections.trending}
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Top Rated Anime"
          items={sections.topRated}
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="New Anime"
          items={sections.newReleases}
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Action Anime"
          items={sections.action}
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Fantasy Anime"
          items={sections.fantasy}
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Romance Anime"
          items={sections.romance}
          onSelect={onSelect}
          progress={progress}
          watched={watched}
          onMarkWatched={onMarkWatched}
          onMarkUnwatched={onMarkUnwatched}
          onToggleSave={onToggleSave}
          isSaved={isSaved}
        />
        <SectionRow
          title="Shounen Favorites"
          items={sections.shounen}
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
