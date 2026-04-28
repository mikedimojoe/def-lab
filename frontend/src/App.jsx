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

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ color: "#333", padding: 40 }}>…</div>;
  if (!user)   return <Navigate to="/" replace />;
  if (adminOnly && user.role !== "Admin") return <Navigate to="/overview" replace />;
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

  return (
    <Routes>
      <Route path="/"
        element={user ? <Navigate to="/overview" replace /> : <Login />}
      />
      <Route path="/overview" element={
        <ProtectedRoute>
          <AppProvider><Layout><Overview /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="/formations" element={
        <ProtectedRoute>
          <AppProvider><Layout><Formations /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="/personnel" element={
        <ProtectedRoute>
          <AppProvider><Layout><Personnel /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="/live" element={
        <ProtectedRoute>
          <AppProvider><Layout><LiveTagging /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="/opponent" element={
        <ProtectedRoute>
          <AppProvider><Layout><Opponent /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="/callsheet" element={
        <ProtectedRoute>
          <AppProvider><Layout><Callsheet /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="/roster" element={
        <ProtectedRoute>
          <AppProvider><Layout><Roster /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <AppProvider><Layout><Admin /></Layout></AppProvider>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
