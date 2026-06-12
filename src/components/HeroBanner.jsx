import { imgUrl } from "../utils/api";
import { PlayIcon } from "./Icons";

export default function HeroBanner({
  item,
  onPlay,
  onToggleSave,
  isSaved,
  onMoreInfo,
  subtitle,
  isAnime,
}) {
  if (!item) return null;

  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const typeLabel = item.media_type === "tv" ? "Series" : "Movie";
  

  return (
    <section className="hero-banner">
      <div
        className="hero-banner__bg"
        style={{ backgroundImage: `url(${imgUrl(item.backdrop_path || item.poster_path, "original")})` }}
      />
      <div className="hero-banner__overlay" />
      <div className="hero-banner__content">
        <div className="hero-banner__eyebrow">{isAnime ? "Anime" : typeLabel}</div>
        <h1 className="hero-banner__title">{title}</h1>
        <div className="flex flex-wrap items-center gap-3 my-4">
  {year && (
    <span className="px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-700 text-zinc-200 text-sm font-medium">
      {year}
    </span>
  )}

  
  {item.vote_average && (
    <span className="px-3 py-1 rounded-full bg-yellow-500 text-black text-sm font-bold">
       .  ⭐{item.vote_average.toFixed(1)}
    </span>
  )}


</div>
        {item.overview ? (
          <p className="hero-banner__overview">{item.overview}</p>
        ) : null}
        <div className="hero-banner__actions">
          <button className="btn btn-primary btn-hero" onClick={onPlay}>
            <PlayIcon />
            Play
          </button>
          <button className="btn btn-secondary btn-hero" onClick={onToggleSave}>
            {isSaved ? "Remove from List" : "Add to List"}
          </button>
          {onMoreInfo ? (
            <button className="btn btn-ghost btn-hero" onClick={onMoreInfo}>
              More Info
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
