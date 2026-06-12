import { useRef } from "react";
import MediaCard from "./MediaCard";

export default function SectionRow({
  title,
  items = [],
  onSelect,
  progress,
  watched,
  onMarkWatched,
  onMarkUnwatched,
  onToggleSave,
  isSaved,
  className = "",
}) {
  const scrollContainerRef = useRef(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320; // 220px card + 16px gap
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className={`section-row${className ? ` ${className}` : ""}`}>
      <div className="section-row__header">
        <h2>{title}</h2>
      </div>
      <div className="section-row__wrapper">
        <button
          className="section-row__scroll-btn section-row__scroll-btn--left"
          onClick={() => handleScroll("left")}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <div className="section-row__cards" ref={scrollContainerRef}>
          {items.map((item) => (
            <div key={`${item.media_type || (item.first_air_date ? "tv" : "movie")}_${item.id}`} className="section-row__card">
              <MediaCard
                item={item}
                onClick={() => onSelect?.(item)}
                progress={progress?.[`${item.media_type || (item.first_air_date ? "tv" : "movie")}_${item.id}`] || 0}
                watched={watched}
                onMarkWatched={onMarkWatched}
                onMarkUnwatched={onMarkUnwatched}
                onToggleSave={() => onToggleSave?.(item)}
                isSaved={isSaved?.(item)}
              />
            </div>
          ))}
        </div>
        <button
          className="section-row__scroll-btn section-row__scroll-btn--right"
          onClick={() => handleScroll("right")}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </section>
  );
}
