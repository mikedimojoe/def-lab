import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider }           from "./contexts/AppContext";
import { ThemeProvider }         from "./contexts/ThemeContext";
import Layout      from "./components/Layout";
import Login       from "./pages/Login";
import Overview    from "./pages/Overview";
import Formations  from "./pages/Formations";
import Personnel   from "./pages/Personnel";
import LiveTagging from "./pages/LiveTagging";
import Opponent    from "./pages/Opponent";
import Callsheet   from "./pages/Callsheet";
import Roster      from "./pages/Roster";
import Admin       from "./pages/Admin";
import Upload      from "./pages/Upload";

function ProtectedRoute({ children, adminOnly = false, noPlayer = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: "#333", padding: 40 }}>…</div>;
  if (!user)   return <Navigate to="/" replace />;
  if (adminOnly && user.role !== "Admin") return <Navigate to="/overview" replace />;
  if (noPlayer && user.role === "Player") return <Navigate to="/overview" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
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
          <Route path="/"          element={<Navigate to="/overview" replace />} />
          <Route path="/overview"  element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="/formations"element={<ProtectedRoute><Formations /></ProtectedRoute>} />
          <Route path="/personnel" element={<ProtectedRoute><Personnel /></ProtectedRoute>} />
          <Route path="/live"      element={<ProtectedRoute><LiveTagging /></ProtectedRoute>} />
          <Route path="/opponent"  element={<ProtectedRoute><Opponent /></ProtectedRoute>} />
          <Route path="/callsheet" element={<ProtectedRoute><Callsheet /></ProtectedRoute>} />
          <Route path="/roster"    element={<ProtectedRoute><Roster /></ProtectedRoute>} />
          <Route path="/upload"    element={<ProtectedRoute noPlayer><Upload /></ProtectedRoute>} />
          <Route path="/admin"     element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="*"          element={<Navigate to="/overview" replace />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
