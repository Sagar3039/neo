import { useState } from "react";
import { signIn, signInWithGoogle } from "../services/auth";

export default function LoginPage({ onLoginSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await signIn(email, password);
      if (result.success) {
        onLoginSuccess?.();
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 40,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 8,
            letterSpacing: 2,
          }}
        >
          NEO
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text3)",
            marginBottom: 28,
          }}
        >
          Sign in to your account
        </div>

        <form onSubmit={handleLogin}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text2)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "var(--font-body)",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              autoFocus
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text2)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--text)",
                  fontSize: 14,
                  fontFamily: "var(--font-body)",
                  boxSizing: "border-box",
                  paddingRight: 40,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--red)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text3)",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 4,
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "rgba(229,9,20,0.1)",
                border: "1px solid rgba(229,9,20,0.3)",
                color: "var(--red)",
                borderRadius: 8,
                padding: 12,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
              {error.includes("not authorized") && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
                  <strong>Fix:</strong> Add your computer name or "localhost" to Firebase Console → Authentication → Settings → Authorized domains
                </div>
              )}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "var(--red)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            margin: "20px 0",
            gap: 10,
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ color: "var(--text3)", fontSize: 12 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const result = await signInWithGoogle();
              if (result.redirected) {
                // Redirect was initiated - browser will open
                // User will complete auth in browser and be redirected back
              } else if (result.success) {
                onLoginSuccess?.();
              } else {
                setLoading(false);
                setError(result.error || "Google sign-in failed");
              }
            } catch (err) {
              setLoading(false);
              setError(err.message || "An error occurred");
            }
          }}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => !loading && (e.target.style.background = "var(--surface2)")}
          onMouseLeave={(e) => !loading && (e.target.style.background = "var(--surface)")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? "Opening browser..." : "Sign in with Google"}
        </button>

        <div
          style={{
            marginTop: 20,
            paddingTop: 20,
            borderTop: "1px solid var(--border)",
            fontSize: 13,
            color: "var(--text3)",
            textAlign: "center",
          }}
        >
          Don't have an account?{" "}
          <button
            onClick={() => onSwitchToSignup?.()}
            style={{
              background: "none",
              border: "none",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            Create one
          </button>
        </div>
      </div>
    </div>
  );
}
