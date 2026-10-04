import { Link, useLocation } from "react-router-dom";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getUserProfile, UserProfile } from "../lib/data";
import { Logo } from "./Logo";
import InstallPrompt from "./InstallPrompt";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  // Responsive label for the levels link on map
  const [vw, setVw] = React.useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isNarrow = vw < 640;
  const levelsLinkLabel = "Find help";
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const { theme, toggleTheme } = useTheme();

  React.useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      try {
        if (user) {
          const p = await getUserProfile(user.uid);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }
      } catch (e) {
        // Non-fatal
        if (mounted) setProfile(null);
      }
    }
    loadProfile();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
      }}
    >
      <header
        className="app-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          padding: "env(safe-area-inset-top) 0 0 0",
          background: "var(--surface)",
          borderBottom: "1px solid var(--border-strong)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "6px 16px",
            maxWidth: 1100,
            margin: "0 auto",
          }}
        >
          <Link
            to="/"
            aria-label="Safe Spaces home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text)",
              padding: "10px 0",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Logo />
          </Link>

          {/* Desktop nav */}
          <nav
            style={{
              display: isNarrow ? "none" : "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {location.pathname !== "/levels" &&
              location.pathname !== "/" &&
              location.pathname !== "/level1" &&
              location.pathname !== "/level2" && (
                <Link
                  to="/levels"
                  style={{
                    textDecoration: "none",
                    color: "var(--text-2)",
                    fontWeight: 700,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "transparent",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    fontSize: 13,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.08em",
                  }}
                  aria-label={levelsLinkLabel}
                  title={levelsLinkLabel}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(135,100,193,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {levelsLinkLabel}
                </Link>
              )}
            <Link
              to="/safety"
              style={{
                textDecoration: "none",
                color: "var(--text-2)",
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                fontSize: 13,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(135,100,193,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Safety tools
            </Link>
            <Link
              to="/profile"
              style={{
                textDecoration: "none",
                color: "var(--text-2)",
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "transparent",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
                fontSize: 13,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(135,100,193,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Profile
            </Link>
            {(profile?.isAdmin || profile?.canAccessAdmin) && (
              <Link
                to="/admin"
                style={{
                  textDecoration: "none",
                  color: "var(--text-2)",
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(135,100,193,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Admin
              </Link>
            )}
          </nav>
          {/* Right side: hamburger on mobile, install on desktop */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Install PWA button appears only when eligible */}
            <div style={{ display: isNarrow ? "none" : "inline-flex" }}>
              <InstallPrompt />
            </div>

            {/* Theme toggle */}
            <button
              aria-label={
                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
              }
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              onClick={toggleTheme}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-strong)",
                background: "var(--surface)",
                color: "var(--text-2)",
                borderRadius: 10,
                padding: 8,
                width: 38,
                height: 38,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {theme === "dark" ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>

            {/* Hamburger */}
            <button
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
              style={{
                display: isNarrow ? "inline-flex" : "none",
                border: "1px solid var(--glass-border)",
                background: "var(--glass-bg)",
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 2,
                  background: "var(--text-2)",
                  display: "block",
                  boxShadow: "0 6px 0 var(--text-2), 0 -6px 0 var(--text-2)",
                }}
              />
            </button>
          </div>
        </div>
      </header>

      <main style={{ minHeight: 0 }}>{children}</main>

      <footer
        style={{
          padding: "16px 16px calc(16px + env(safe-area-inset-bottom))",
          background: "transparent",
          borderTop: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
          Built with care • Always here for you
        </p>
      </footer>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "80%",
              maxWidth: 320,
              background: "var(--surface-2)",
              borderLeft: "2px solid var(--border)",
              padding: "20px 16px",
              display: "grid",
              alignContent: "start",
              gap: 12,
            }}
          >
            <button
              onClick={() => setMenuOpen(false)}
              style={{
                justifySelf: "end",
                border: "1.5px solid var(--brand)",
                background: "transparent",
                color: "var(--brand)",
                borderRadius: 10,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Close
            </button>
            <MenuLink
              to="/"
              label="Home"
              onNavigate={() => setMenuOpen(false)}
            />
            {location.pathname !== "/levels" && (
              <MenuLink
                to="/levels"
                label={levelsLinkLabel}
                onNavigate={() => setMenuOpen(false)}
              />
            )}
            <MenuLink
              to="/safety"
              label="Safety tools"
              onNavigate={() => setMenuOpen(false)}
            />
            <MenuLink
              to="/profile"
              label="Profile"
              onNavigate={() => setMenuOpen(false)}
            />
            {(profile?.isAdmin || profile?.canAccessAdmin) && (
              <MenuLink
                to="/admin"
                label="Admin"
                onNavigate={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      style={{
        textDecoration: "none",
        color: "var(--brand)",
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid var(--border-strong)",
        background: "var(--surface)",
        fontWeight: 700,
        fontSize: 16,
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </Link>
  );
}
