import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const LINKS = [
  { to: "/",          label: "Home" },
  { to: "/standings", label: "Tabelle" },
  { to: "/teams",     label: "Teams" },
  { to: "/matches",   label: "Matches" },
  { to: "/analytics", label: "Scout" },
];

export default function Nav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo" onClick={() => setOpen(false)}>
        <span className="nav-logo-def">def</span>
        <span className="nav-logo-lab">-lab</span>
      </Link>

      <div className="nav-links">
        {LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`nav-link ${pathname === to ? "active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <button
        className={`burger ${open ? "open" : ""}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle menu"
      >
        <span /><span /><span />
      </button>

      {open && (
        <div className="mobile-drawer">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`mobile-link ${pathname === to ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
