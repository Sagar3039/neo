import { useState, useEffect, useRef } from "react";
import { NeoLogo, PlayIcon } from "./Icons";
import { validateTmdbKey, getValidationErrorMessage, saveTmdbKey } from "../services/tmdbKeyService";

function ExternalLink({ href, className, children }) {
  return (
    <a
      className={className}
      href={href}
      onClick={(e) => {
        e.preventDefault();
        window.electron.openExternal(href);
      }}
    >
      {children}
    </a>
  );
}

export default function SetupScreen({ onSave, onSkip }) {
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null); // { title, body }
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      window.focus();
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async () => {
    const token = key.trim();
    if (!token) return;
    setChecking(true);
    setError(null);
    const result = await validateTmdbKey(token);
    setChecking(false);
    if (result.ok) {
      // Save key to Firebase Firestore (or localStorage as fallback)
      await saveTmdbKey(token);
      onSave(token);
    } else {
      setError(getValidationErrorMessage(result.reason, result.status));
    }
  };

  return (
    <div className="apikey-modal">
      <div className="apikey-box">
        <div className="apikey-logo">
          <NeoLogo size={52} />
        </div>
        <div className="apikey-title">NEO</div>
        <p className="apikey-sub">
          Enter your <strong>free</strong> TMDB{" "}
          <strong>Read Access Token</strong> to get started.
          <br />
          Go to{" "}
          <ExternalLink
            className="apikey-link"
            href="https://www.themoviedb.org/settings/api"
          >
            themoviedb.org → Settings → API
          </ExternalLink>{" "}
          and copy the <em>API Read Access Token</em> (the long JWT, not the
          shorter API Key below).
          <br />
          <ExternalLink
            className="apikey-link"
            href="https://github.com/truelockmc/streambert/blob/main/tmdb-tutorial.md"
          >
            Step-by-step guide on how to get that Token
          </ExternalLink>
        </p>
        <input
          className={`apikey-input${error ? " apikey-input-error" : ""}`}
          placeholder="Paste your TMDB Read Access Token (eyJ...)..."
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && !checking && handleSubmit()}
          ref={inputRef}
          disabled={checking}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            borderColor: error ? "#f44336" : focused ? "var(--red)" : undefined,
          }}
        />

        {error && (
          <div className="apikey-error-box">
            <div className="apikey-error-title">⚠ {error.title}</div>
            <div className="apikey-error-body">{error.body}</div>
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "13px",
            marginTop: error ? 0 : undefined,
          }}
          onClick={handleSubmit}
          disabled={!key.trim() || checking}
        >
          {checking ? (
            <>
              <span className="apikey-spinner" /> Checking…
            </>
          ) : (
            <>
              <PlayIcon /> Let's go
            </>
          )}
        </button>

        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              marginTop: 14,
              background: "none",
              border: "none",
              color: "var(--text3)",
              fontSize: 13,
              cursor: "pointer",
              padding: "6px 0",
              width: "100%",
              textAlign: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text2)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
