import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
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
const AuthPage = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail.tsx"));
const SafetyListenerPage = lazy(() => import("./pages/SafetyListenerPage.tsx"));
const RecordingsPage = lazy(() => import("./pages/RecordingsPage.tsx"));

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function RequireVerified({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return null; // Parent handles auth
  if (!user.emailVerified) return <Navigate to="/verify" replace />;
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
      <AuthProvider>
        <SyncBridge />
        <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
          <Routes>
            {/* Public auth route */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Protected app */}
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <AppShell>
                    <Routes>
                      {/* Allow unverified users to visit the verify screen */}
                      <Route path="/verify" element={<VerifyEmail />} />
                      {/* All other routes require verified emails */}
                      <Route
                        path="/"
                        element={
                          <RequireVerified>
                            <HomeOrAdmin />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/levels"
                        element={
                          <RequireVerified>
                            <LevelSelect />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/level1"
                        element={
                          <RequireVerified>
                            <Level1Needs />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/level2"
                        element={
                          <RequireVerified>
                            <Level2Needs />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <RequireVerified>
                            <Profile />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/map"
                        element={
                          <RequireVerified>
                            <MapView />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          <RequireVerified>
                            <Admin />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/safety"
                        element={
                          <RequireVerified>
                            <SafetyListenerPage />
                          </RequireVerified>
                        }
                      />
                      <Route
                        path="/recordings"
                        element={
                          <RequireVerified>
                            <RecordingsPage />
                          </RequireVerified>
                        }
                      />
                    </Routes>
                  </AppShell>
                </RequireAuth>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
