import { useState, useEffect } from "react";
import { NeoLogo, SearchIcon, SettingsIcon, DownloadsQueueIcon, HomeIcon, HistoryIcon } from "./Icons";

export default function Navbar({
  page,
  onNavigate,
  onSearch,
  activeDownloads,
  canGoBack,
  onBack,
  onShowShortcuts,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const el = document.querySelector(".main");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", handler);
    return () => el.removeEventListener("scroll", handler);
  }, []);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "movies", label: "Movies" },
    { id: "tvshows", label: "TV" },
    { id: "anime", label: "Anime" },
    { id: "history", label: "My List" },
    { id: "downloads", label: "Downloads", badge: activeDownloads > 0 ? activeDownloads : null },
  ];

  return (
    <header className={`neo-navbar${scrolled ? " neo-navbar--scrolled" : ""}`}>
      {/* Left: Logo + Nav */}
      <div className="neo-navbar__left">
        <div
          className="neo-navbar__logo"
          onClick={() => onNavigate("home")}
          title="Neo"
        >
          <NeoLogo size={32} />
          <span className="neo-navbar__brand">NEO</span>
        </div>

        <nav className="neo-navbar__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`neo-navbar__nav-item${page === item.id ? " neo-navbar__nav-item--active" : ""}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
              {item.badge && (
                <span className="neo-navbar__badge">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="neo-navbar__right">
        <button className="neo-navbar__icon-btn" onClick={onSearch} title="Search (⌘F)">
          <SearchIcon />
        </button>
        {canGoBack && (
          <button className="neo-navbar__icon-btn" onClick={onBack} title="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button
          className={`neo-navbar__icon-btn${page === "settings" ? " neo-navbar__icon-btn--active" : ""}`}
          onClick={() => onNavigate("settings")}
          title="Settings"
        >
          <SettingsIcon />
        </button>
        <button
          className="neo-navbar__icon-btn"
          onClick={() => window.electron?.quitApp?.()}
          title="Quit"
          style={{ color: "#e53e3e" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </header>
  );
}
