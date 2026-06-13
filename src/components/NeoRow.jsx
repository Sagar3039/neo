import { useRef, memo, useCallback } from "react";
import NeoCard from "./NeoCard";

/**
 * NeoRow — Horizontally-scrollable content row.
 *
 * Performance improvements:
 *  1. Native CSS scroll (no JS scroll hijacking)
 *  2. Scroll buttons appear on hover via CSS, not React state
 *  3. scrollBy() is compositor-driven — no layout recalc
 *  4. Each card: contain:layout style prevents row reflow on card hover
 *  5. overflow-y:visible allows hover shadow to escape without clip
 */
const NeoRow = memo(function NeoRow({
  title,
  items = [],
  onSelect,
  progress,
  watched,
  onToggleSave,
  isSaved,
  badge = null,
  className = "",
  skeletonCount = 6,
  loading = false,
}) {
  const trackRef = useRef(null);

  const scroll = useCallback((dir) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({
      left: dir === "left" ? -520 : 520,
      behavior: "smooth",
    });
  }, []);

  if (loading) {
    return (
      <div className={`neo-section ${className}`}>
        <div className="neo-skeleton neo-skeleton-header" />
        <div className="neo-skeleton-row">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className="neo-skeleton-card">
              <div className="neo-skeleton neo-skeleton-card__poster" />
              <div className="neo-skeleton neo-skeleton-card__title" />
              <div className="neo-skeleton neo-skeleton-card__meta" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className={`neo-section ${className}`}>
      <div className="neo-section__header">
        <h2 className="neo-section__title">{title}</h2>
        {badge && <span className="neo-section__badge">{badge}</span>}
      </div>
      <div className="neo-row">
        <button
          className="neo-row__btn neo-row__btn--left"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
        >
          ‹
        </button>
        <div
          className="neo-row__track"
          ref={trackRef}
          style={{ overflowY: "visible" }}
        >
          {items.map((item) => {
            const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
            const key = `${mediaType}_${item.id}`;
            return (
              <div key={key} className="neo-row__item" style={{ overflow: "visible" }}>
                <NeoCard
                  item={item}
                  onClick={() => onSelect?.(item)}
                  progress={progress?.[key] || 0}
                  watched={watched}
                  onToggleSave={() => onToggleSave?.(item)}
                  isSaved={isSaved?.(item)}
                />
              </div>
            );
          })}
        </div>
        <button
          className="neo-row__btn neo-row__btn--right"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
        >
          ›
        </button>
      </div>
    </div>
  );
});

export default NeoRow;
