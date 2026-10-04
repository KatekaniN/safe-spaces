import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { processPendingUploads } from "./lib/api";
import { getUserProfile } from "./lib/data";

// Route-based code splitting for faster initial load
const Home = lazy(() => import("./pages/Home"));
const LevelSelect = lazy(() => import("./pages/LevelSelect"));
const MapView = lazy(() => import("./pages/MapView"));
const Level1Needs = lazy(() => import("./pages/Level1Needs.tsx"));
const Level2Needs = lazy(() => import("./pages/Level2Needs.tsx"));
const Profile = lazy(() => import("./pages/Profile"));
const AppShell = lazy(() => import("./components/AppShell.tsx"));
const Admin = lazy(() => import("./pages/Admin"));
const SafetyListenerPage = lazy(() => import("./pages/SafetyListenerPage.tsx"));
const RecordingsPage = lazy(() => import("./pages/RecordingsPage.tsx"));

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  // Anonymous sign-in happens automatically; just wait for it
  if (loading || !user) return <div style={{ padding: 16 }}>Loading…</div>;
  return children;
}

function HomeOrAdmin() {
  const { user } = useAuth();
  const [checked, setChecked] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    async function run() {
      if (!user) {
        if (alive) {
          setChecked(true);
          setHasAdmin(false);
        }
        return;
      }
      try {
        const p = await getUserProfile(user.uid);
        const access = !!(
          p &&
          (p.isAdmin ||
            p.canAccessAdmin ||
            p.role === "admin" ||
            p.role === "law" ||
            p.role === "security")
        );
        if (alive) {
          setHasAdmin(access);
          setChecked(true);
        }
      } catch {
        if (alive) setChecked(true);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!checked) return <div style={{ padding: 16 }}>Loading…</div>;
  if (hasAdmin) return <Navigate to="/admin" replace />;
  return <Home />;
}

const App = () => {
  // Bridge SW background sync and online events to app-side queue processing
  const SyncBridge = () => {
    const { user } = useAuth();
    useEffect(() => {
      const uid = user?.uid;
      if (!uid) return;
      // Attempt to process queue on login/app start
      processPendingUploads(uid);
    }, [user?.uid]);

    useEffect(() => {
      const uid = user?.uid;
      if (!uid) return;
      function onMessage(e: MessageEvent) {
        if ((e?.data as any)?.type === "sw-sync:upload-recordings") {
          processPendingUploads(uid);
        }
      }
      function onOnline() {
        processPendingUploads(uid);
      }
      navigator.serviceWorker?.addEventListener?.("message", onMessage as any);
      window.addEventListener("online", onOnline);
      return () => {
        navigator.serviceWorker?.removeEventListener?.(
          "message",
          onMessage as any
        );
        window.removeEventListener("online", onOnline);
      };
    }, [user?.uid]);
    return null;
  };
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SyncBridge />
        <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
          <Routes>
            {/* Legacy auth route redirects home (no login needed) */}
            <Route path="/auth" element={<Navigate to="/" replace />} />

            {/* App */}
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<HomeOrAdmin />} />
                      <Route path="/levels" element={<LevelSelect />} />
                      <Route path="/level1" element={<Level1Needs />} />
                      <Route path="/level2" element={<Level2Needs />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/map" element={<MapView />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/safety" element={<SafetyListenerPage />} />
                      <Route
                        path="/recordings"
                        element={<RecordingsPage />}
                      />
                    </Routes>
                  </AppShell>
                </RequireAuth>
              }
            />
          </Routes>
        </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
