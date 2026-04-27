import { Routes, Route } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import TeamDetail from "./pages/TeamDetail";
import Matches from "./pages/Matches";
import Standings from "./pages/Standings";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/teams"       element={<Teams />} />
          <Route path="/teams/:id"   element={<TeamDetail />} />
          <Route path="/matches"     element={<Matches />} />
          <Route path="/standings"   element={<Standings />} />
          <Route path="/analytics"   element={<Analytics />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
