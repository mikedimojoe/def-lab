import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ padding: 24 }}>
      <div style={{ color: "var(--text1)", fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Willkommen, {user?.display_name || user?.username}
      </div>
      <div style={{ color: "var(--text3)", fontSize: 13, marginBottom: 32 }}>
        DEF LAB — Football Analytics
      </div>
      <button
        onClick={() => navigate("/overview")}
        style={{
          background: "var(--accent)", color: "#154734",
          border: "none", borderRadius: 6,
          padding: "10px 24px", fontSize: 13, fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Zum Overview →
      </button>
    </div>
  );
}
