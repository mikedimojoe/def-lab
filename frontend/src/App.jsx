import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider }           from "./contexts/AppContext";
import { ThemeProvider }         from "./contexts/ThemeContext";
import { AppearanceProvider }    from "./contexts/AppearanceContext";
import { useAppearance }         from "./contexts/AppearanceContext";
import { useTheme }              from "./contexts/ThemeContext";
import { apiGetUserSettings }    from "./lib/api";
import Layout        from "./components/Layout";
import Login         from "./pages/Login";
import Home          from "./pages/Home";
import Overview      from "./pages/Overview";
import GameOverview  from "./pages/GameOverview";
import Formations    from "./pages/Formations";
import Personnel     from "./pages/Personnel";
import LiveTagging   from "./pages/LiveTagging";
import Callsheet     from "./pages/Callsheet";
import Roster        from "./pages/Roster";
import Admin         from "./pages/Admin";
import Upload        from "./pages/Upload";
import FieldPosition  from "./pages/FieldPosition";
import CallsheetTest  from "./pages/CallsheetTest";
import Print         from "./pages/Print";
import Settings      from "./pages/Settings";
import Drawings from "./pages/Drawings";

function ProtectedRoute({ children, adminOnly = false, noPlayer = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: "#333", padding: 40 }}>…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "Admin") return <Navigate to="/overview" replace />;
  if (noPlayer && user.role === "Player") return <Navigate to="/overview" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const { applyUserColors } = useAppearance();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!user) return;
    apiGetUserSettings().then(s => {
      if (s.theme)                      setTheme(s.theme);
      if (s.run_color || s.pass_color)  applyUserColors(s.run_color, s.pass_color);
    }).catch(() => {});
  }, [user?.id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#111",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#5CBF8A", fontSize: 13, letterSpacing: 2 }}>DEF LAB</span>
    </div>
  );

  if (!user) return (
    <Routes>
      <Route path="*" element={<Login />} />
    </Routes>
  );

  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/"                element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/login"           element={<Navigate to="/" replace />} />
          <Route path="/overview"        element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="/game-overview"   element={<ProtectedRoute><GameOverview /></ProtectedRoute>} />
          <Route path="/formations"      element={<ProtectedRoute><Formations /></ProtectedRoute>} />
          <Route path="/personnel"       element={<ProtectedRoute><Personnel /></ProtectedRoute>} />
          <Route path="/live"            element={<ProtectedRoute><LiveTagging /></ProtectedRoute>} />
          <Route path="/callsheet"       element={<ProtectedRoute><Callsheet /></ProtectedRoute>} />
          <Route path="/callsheet-test"  element={<ProtectedRoute><CallsheetTest /></ProtectedRoute>} />
          <Route path="/roster"          element={<ProtectedRoute><Roster /></ProtectedRoute>} />
          <Route path="/drawings"        element={<ProtectedRoute><Drawings /></ProtectedRoute>} />
          <Route path="/print"           element={<ProtectedRoute noPlayer><Print /></ProtectedRoute>} />
          <Route path="/field-position"  element={<ProtectedRoute><FieldPosition /></ProtectedRoute>} />
          <Route path="/upload"          element={<ProtectedRoute noPlayer><Upload /></ProtectedRoute>} />
          <Route path="/settings"        element={<ProtectedRoute><Settings /></ProtectedRoute>} />
<Route path="/admin"           element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AppearanceProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
