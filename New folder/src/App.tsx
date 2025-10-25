import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import LevelSelect from "./pages/LevelSelect";
import MapView from "./pages/MapView";
import Level1Needs from "./pages/Level1Needs.tsx";
import Level2Needs from "./pages/Level2Needs.tsx";
import Profile from "./pages/Profile";
import AppShell from "./components/AppShell.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import AuthPage from "./pages/Auth";
import { useAuth } from "./contexts/AuthContext";

function RequireAuth({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                    <Route path="/" element={<Home />} />
                    <Route path="/levels" element={<LevelSelect />} />
                    <Route path="/level1" element={<Level1Needs />} />
                    <Route path="/level2" element={<Level2Needs />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/map" element={<MapView />} />
                  </Routes>
                </AppShell>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
