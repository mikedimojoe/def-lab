import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0, position: "relative", height: "100%" }}>
        {children}
      </main>
    </div>
  );
}
