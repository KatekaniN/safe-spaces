import { Link, useLocation, useNavigate } from "react-router-dom";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile, UserProfile } from "../lib/data";
import logoUrl from "../assets/safe-spaces.png";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const onMap = location.pathname.startsWith("/map");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
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
  const levelsLinkLabel = onMap
    ? isNarrow
      ? "Switch Space"
      : "Switch Safe Space"
    : "Spaces";
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);

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
          background: "rgba(255,255,255,0.98)",
          backdropFilter: "saturate(160%) blur(10px)",
          borderBottom: "1px solid rgba(135,100,193,0.1)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "calc(12px + env(safe-area-inset-top)) 16px 12px 16px",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "#111827",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <img
              src={logoUrl}
              alt="Safe Spaces"
              width={60}
              height={60}
              style={{
                display: "block",
                /*  borderRadius: 8,
                boxShadow: "0 2px 8px rgba(135,100,193,0.15)"*/
              }}
            />
            {/*  <strong style={{ color: "#8764C1", fontSize: 16 }}>
              Safe Spaces
            </strong >*/}
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
                    color: "#8764C1",
                    fontWeight: 700,
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #8764C1",
                    background: "transparent",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                    fontSize: 16,
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
            {onMap && (
              <span
                style={{ color: "#6B7280", fontSize: 14, padding: "8px 6px" }}
              >
                Map
              </span>
            )}
            <Link
              to="/profile"
              style={{
                textDecoration: "none",
                color: "#8764C1",
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 10,
                border: "1.5px solid #8764C1",
                background: "transparent",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                fontSize: 16,
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
                  color: "#8764C1",
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #8764C1",
                  background: "transparent",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                  fontSize: 16,
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
          {/* Right side: hamburger on mobile, sign out on desktop */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!loading && user && !isNarrow && (
              <button
                onClick={signOut}
                title={user.email || "Sign out"}
                style={{
                  border: "1.5px solid #E5E7EB",
                  background: "#fff",
                  color: "#111827",
                  fontWeight: 700,
                  borderRadius: 10,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            )}

            {/* Hamburger */}
            <button
              aria-label="Menu"
              onClick={() => setMenuOpen(true)}
              style={{
                display: isNarrow ? "inline-flex" : "none",
                border: "1.5px solid #E5E7EB",
                background: "#fff",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 2,
                  background: "#374151",
                  display: "block",
                  boxShadow: "0 6px 0 #374151, 0 -6px 0 #374151",
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
          background: "rgba(247,247,248,0.6)",
          borderTop: "1px solid rgba(135,100,193,0.08)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12 }}>
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
              background: "#FAFAFA",
              borderLeft: "2px solid #E5E7EB",
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
                border: "1.5px solid #8764C1",
                background: "transparent",
                color: "#8764C1",
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
            {!loading && user && (
              <button
                onClick={async () => {
                  await signOut();
                  setMenuOpen(false);
                  navigate("/auth");
                }}
                style={{
                  border: "1.5px solid #EC96BE",
                  background: "#fff",
                  borderRadius: 12,
                  padding: "14px 16px",
                  textAlign: "left",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#EC96BE",
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
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
        color: "#1F2937",
        padding: "14px 16px",
        borderRadius: 12,
        border: "1.5px solid #E5E7EB",
        background: "#fff",
        fontWeight: 700,
        fontSize: 15,
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </Link>
  );
}
