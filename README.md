# DEF LAB — Schwäbisch Hall Unicorns Analytics App

Football Analytics Web-App für die Schwäbisch Hall Unicorns. Läuft unter **def-lab.de**.

---

## Inhaltsverzeichnis
1. [Projektübersicht](#1-projektübersicht)
2. [Tech Stack](#2-tech-stack)
3. [Architektur](#3-architektur)
4. [Dateistruktur](#4-dateistruktur)
5. [API-Endpunkte](#5-api-endpunkte)
6. [Lokale Entwicklung](#6-lokale-entwicklung)
7. [Deployment (aktuell: INWX/webspace.bz)](#7-deployment-aktuell-inwxwebspacebz)
8. [Zugangsdaten & Infrastruktur](#8-zugangsdaten--infrastruktur)
9. [Aktueller Stand & bekannte Probleme](#9-aktueller-stand--bekannte-probleme)
10. [Nächste Schritte / Migrations-Plan](#10-nächste-schritte--migrations-plan)

---

## 1. Projektübersicht

DEF LAB ist eine multi-device Web-App für American Football Coaching & Analyse:

- **Live-Tagging**: Plays während des Spiels in Echtzeit erfassen
- **Overview / Callsheet / Personnel**: Play-Auswertungen und Statistiken
- **Formations**: Formations-Bilder verwalten (Upload, Zuordnung)
- **Opponent**: Gegner-Scouting mit Formation-Bildern
- **Roster**: Tiefendiagramm (Depth Chart) und Roster-Import
- **Admin**: Benutzer-, Team-, Saison- und Spielverwaltung

**Ziel:** Alle Coaches können von beliebigen Geräten auf dieselben Daten zugreifen (kein localStorage mehr).

---

## 2. Tech Stack

### Frontend
- **React 18** + **Vite**
- **React Router v6** (Client-side Routing)
- **Recharts** (Statistik-Charts)
- Kein UI-Framework — alles inline styles (Dark Theme, Green `#154734`)

### Backend
- **PHP 8** (Shared Hosting, kein Node/Python auf Produktion)
- **MySQL/MariaDB** via PDO
- PHP-Sessions für Auth (`session_name('dl_session')`)
- REST-API unter `/api/*.php`

### Hosting (aktuell)
- **INWX webspace.bz** — Shared Hosting mit Froxlor Control Panel
- Domain: **def-lab.de** (registriert bei INWX, läuft bis 27.04.2027)
- Server-IP: **185.181.105.83**
- Webroot: `/srv/customer/docroot/kd246830/html/`

---

## 3. Architektur

```
Browser (React SPA)
       │
       ├── /            → index.html (React App)
       ├── /assets/*    → JS/CSS Build-Dateien
       ├── /api/*       → PHP REST-API
       └── /uploads/*   → Hochgeladene Bilder (Formations)

PHP API (/api/)
       │
       ├── auth.php        ← Login, Logout, Session, Passwort-Änderung
       ├── teams.php       ← Team CRUD
       ├── users.php       ← User CRUD (nur Admin)
       ├── seasons.php     ← Saison CRUD
       ├── games.php       ← Spiele CRUD
       ├── plays.php       ← Play-Daten speichern/laden
       ├── live.php        ← Live-Tagging Zeilen speichern/laden
       ├── roster.php      ← Depth Chart + Import-Daten
       ├── images.php      ← Bild-Upload/Delete/Liste
       └── config.php      ← DB-Verbindung, CORS-Header
```

### Auth-Flow
1. `POST /api/auth.php?action=login` → PHP-Session wird erstellt
2. Alle weiteren Requests senden Cookie (`credentials: 'include'`)
3. `GET /api/auth.php?action=me` → prüft Session beim App-Start
4. `POST /api/auth.php?action=logout` → Session zerstören

### Rollen
- **admin**: Vollzugriff (User/Team-Verwaltung, alle Daten)
- **coach**: Normaler Zugriff (eigene Team-Daten)

---

## 4. Dateistruktur

```
def-lab/
├── README.md                    ← diese Datei
├── frontend/
│   ├── src/
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx  ← Session via apiMe(), login(), logout()
│   │   │   └── AppContext.jsx   ← Seasons, Games, PlayRows, LiveRows (API)
│   │   ├── lib/
│   │   │   └── api.js           ← Zentrale API-Funktionen (alle fetch-Calls)
│   │   ├── components/
│   │   │   └── Sidebar.jsx      ← Navigation + Saison/Spiel-Auswahl
│   │   └── pages/
│   │       ├── Login.jsx        ← Login + Invite-Link-Flow
│   │       ├── Overview.jsx     ← Play-Statistiken
│   │       ├── LiveTagging.jsx  ← Live-Play-Erfassung (800ms debounce)
│   │       ├── Roster.jsx       ← Depth Chart (API-basiert)
│   │       ├── Personnel.jsx
│   │       ├── Callsheet.jsx
│   │       ├── Opponent.jsx     ← Gegner-Formations (API-Bilder)
│   │       ├── Formations.jsx   ← Bild-Upload/-Verwaltung (API)
│   │       └── Admin.jsx        ← User/Team/Saison/Spiel-Verwaltung
│   ├── vite.config.js           ← Dev-Proxy: /api + /uploads → def-lab.de
│   └── package.json
└── backend/
    └── .htaccess                ← React SPA Routing + PHP-Settings
```

> **Hinweis:** Die PHP-Backend-Dateien (`config.php`, `auth.php`, etc.) existieren nur auf dem Server (wurden via `install.php` erstellt) — **nicht** im lokalen Repo. Sie müssen bei Server-Wechsel neu hochgeladen werden.

---

## 5. API-Endpunkte

Alle Requests: `credentials: 'include'`, JSON body/response `{ ok: true, data: ... }` oder `{ ok: false, error: "..." }`.

| Endpunkt | Methoden | Beschreibung |
|----------|----------|--------------|
| `/api/auth.php?action=login` | POST | `{ username, password }` → Session |
| `/api/auth.php?action=logout` | POST | Session zerstören |
| `/api/auth.php?action=me` | GET | Aktuellen User zurückgeben |
| `/api/auth.php?action=change_password` | POST | `{ password }` |
| `/api/teams.php` | GET, POST, PUT, DELETE | Team CRUD |
| `/api/users.php` | GET, POST, PUT, DELETE | User CRUD (Admin) |
| `/api/seasons.php` | GET, POST, DELETE | Saison CRUD |
| `/api/games.php` | GET, POST, DELETE | Spiele CRUD |
| `/api/plays.php?game_id=X` | GET, POST | Play-Daten |
| `/api/live.php?game_id=X` | GET, POST | Live-Tagging-Zeilen |
| `/api/roster.php?game_id=X` | GET, POST | Depth Chart + Import |
| `/api/images.php` | GET, POST, DELETE | Formation-Bilder |

---

## 6. Lokale Entwicklung

```bash
cd frontend
npm install
npm run dev
```

Dev-Server läuft auf `http://localhost:5173`.

Der Vite-Dev-Proxy leitet `/api/*` und `/uploads/*` an `https://def-lab.de` weiter (konfiguriert in `vite.config.js`). D.h. beim lokalen Entwickeln werden die Daten vom Live-Server gelesen/geschrieben.

> Falls du gegen einen lokalen PHP-Server entwickeln willst, `vite.config.js` target auf `http://localhost:8000` ändern.

### Build erstellen

```bash
cd frontend
npm run build
```

Output: `frontend/dist/` — diese Dateien kommen auf den Server.

---

## 7. Deployment (aktuell: INWX/webspace.bz)

### Manueller Upload via WebFTP

1. `npm run build` im `frontend/`-Ordner ausführen
2. In Froxlor → FTP → WebFTP öffnen (`webftp.webspace.bz`)
3. In den Ordner `/html/` navigieren
4. Folgende Dateien hochladen/ersetzen:
   - `dist/index.html` → `/html/index.html`
   - `dist/assets/*` → `/html/assets/` (alle JS/CSS-Dateien)
   - `backend/.htaccess` → `/html/.htaccess` (einmalig, wenn nicht vorhanden)

> **Wichtig:** Die alten Asset-Dateien in `/html/assets/` vorher löschen, damit keine veralteten Dateien übrig bleiben!

### PHP-Backend einrichten (einmalig)

Die PHP-Dateien werden über `install.php` auf dem Server erstellt:

1. `install.php` nach `/html/api/install.php` hochladen
2. Browser: `https://def-lab.de/api/install.php?key=SETUP_deflab_2026`
3. Prüfen ob alle Tabellen ✅ erstellt wurden
4. **`install.php` danach löschen!** (Sicherheitsrisiko)

### .htaccess auf dem Server

Muss in `/html/.htaccess` liegen:

```apache
Options -Indexes

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteCond %{REQUEST_URI} !^/uploads/
    RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_php8.c>
    php_value upload_max_filesize 10M
    php_value post_max_size 12M
    php_value memory_limit 128M
</IfModule>
```

---

## 8. Zugangsdaten & Infrastruktur

> **Sicherheitshinweis:** Echte Passwörter niemals hier eintragen. Die folgenden Infos sind Strukturdaten.

| System | URL | Benutzername |
|--------|-----|-------------|
| App (Admin) | https://def-lab.de | `admin` / Passwort ändern! |
| Froxlor Hosting | https://prod0.webspace.bz | `kd246830` |
| WebFTP | https://webftp.webspace.bz | `kd246830ftp1` (Pfad: /html/) |
| phpMyAdmin | https://pma.webspace.bz | `kd246830` |
| INWX (DNS + Domain) | https://www.inwx.de | Markus Freckmann Account |
| GitHub Repo | https://github.com/mikedimojoe/def-lab | — |

### DNS-Einstellungen (INWX)
```
def-lab.de    A       185.181.105.83   TTL 3600
www           CNAME   def-lab.de       TTL 3600
```

### Datenbank
- **Name:** `kd246830db1`
- **Beschreibung:** def-lab-DB
- **Größe:** 176 KiB (Stand 29.04.2026)
- Host: MySQL-Server des INWX-Hostings

---

## 9. Aktueller Stand & bekannte Probleme

### ✅ Fertig implementiert

- [x] PHP REST-API komplett (auth, teams, users, seasons, games, plays, live, roster, images)
- [x] Datenbank-Schema erstellt und befüllt (via install.php)
- [x] Frontend vollständig von localStorage auf PHP-API migriert
- [x] Multi-Device: Daten werden zentral in MySQL gespeichert
- [x] Auth via PHP-Sessions (`credentials: 'include'`)
- [x] 800ms Debounce bei LiveTagging und Roster-Saves
- [x] Formations-Bilder via API (Upload/Delete)
- [x] Admin-Panel: User/Team/Saison/Spiel CRUD
- [x] Invite-Links für neue User (`?invite=userId&pw=tempPasswort`)
- [x] .htaccess für React SPA-Routing

### ❌ Aktuelles Hauptproblem: Server down (29.04.2026)

**def-lab.de ist seit ca. 07:38 Uhr am 29.04.2026 nicht erreichbar.**

**Ursache:** Froxlor-Domain-Edit um 07:38 hat Apache-Cron getriggert. Apache ist danach nicht mehr hochgekommen.

**Diagnose-Timeline:**
- `07:25` — Letzte erfolgreiche HTTP-Anfragen im Apache-Access-Log (200 OK)
- `07:38` — `[API] edited domain 'def-lab.de'` im Froxlor-System-Log
- `07:38+` — Server antwortet nicht mehr (ECONNREFUSED auf Port 80/443)

**Mögliche Zusatzursache:** INWX-Rechenzentrum BER2 hatte am 27.04.2026 einen Netzwerk-Vorfall (fehlerhafter Switch). Möglicherweise nicht vollständig behoben.

**Lösung:** INWX Support kontaktieren:
- Telefon: **030 / 983 212 0** (Mo–Do 9–17, Fr 9–16 Uhr)
- Web: [inwx.de/de/aboutus/support](https://www.inwx.de/de/aboutus/support)
- Beschreibung: "Apache auf 185.181.105.83 antwortet nicht nach Froxlor-Domain-Bearbeitung"

### ⚠️ Noch offen (nach Server-Wiederherstellung zu prüfen)

- [ ] **"Lädt ewig"-Bug:** App wurde geladen (Logs zeigen 200 für JS/CSS), aber API-Calls hingen. Wahrscheinlich `apiMe()` in AuthContext bekommt keine Antwort vom PHP-Backend. Ursache: Möglicherweise fehlende PHP-Session-Konfiguration oder CORS-Problem auf HTTP (kein HTTPS = Cookies blockiert?).
- [ ] **HTTPS / SSL:** Aktuell kein SSL-Zertifikat. Browser zeigt "Nicht sicher". → In Froxlor → Domains → SSL-Zertifikate: Let's Encrypt aktivieren.
- [ ] **Admin-Passwort ändern:** Standard-Passwort `admin123` muss geändert werden.
- [ ] **install.php löschen:** Datei liegt noch auf dem Server — Sicherheitsrisiko!
- [ ] **Alt-Assets aufräumen:** In `/html/assets/` könnten veraltete Build-Dateien liegen.

---

## 10. Nächste Schritte / Migrations-Plan

### Option A: Beim INWX Hosting bleiben (Kurzfristig)

1. INWX Support anrufen → Apache neu starten lassen
2. HTTPS/Let's Encrypt in Froxlor aktivieren
3. Admin-Passwort ändern
4. install.php löschen
5. App testen und "lädt ewig"-Bug debuggen (Browser DevTools → Network-Tab)

### Option B: Umzug zu Hetzner Cloud VPS (Empfohlen — langfristig)

**Warum Hetzner?**
- VPS CX22: €3.29/Monat, deutsches Rechenzentrum
- Voller SSH-Zugriff — kein Froxlor-Chaos
- Apache/PHP/MySQL direkt steuerbar (`systemctl restart apache2`)
- Deutlich stabiler als Shared Hosting
- Kein "Support anrufen wenn Server down"

**Migrations-Schritte:**
1. Hetzner-Account anlegen, VPS CX22 (Ubuntu 24.04) buchen
2. Server einrichten: Apache2 + PHP8 + MySQL via SSH (kann mit Claude gemacht werden)
3. PHP-Dateien hochladen (via SFTP oder Git-Clone)
4. Datenbank-Export von INWX phpMyAdmin → Import auf Hetzner
5. DNS-A-Record in INWX auf neue Hetzner-IP umstellen
6. Let's Encrypt SSL auf Hetzner einrichten (certbot)
7. INWX-Hosting kündigen

**Geschätzter Aufwand:** 1–2 Stunden mit Unterstützung.

---

## Changelog

| Datum | Was |
|-------|-----|
| 27.04.2026 | Projekt aufgesetzt, INWX-Hosting eingerichtet, DNS konfiguriert |
| 27.04.2026 | INWX BER2-Rechenzentrum Netzwerk-Vorfall (behobener Switch-Fehler) |
| 28.04.2026 | DNS-Problem behoben (A-Record war `.76` statt `.83`) |
| 28.04.2026 | PHP-Backend via install.php eingerichtet, Datenbank erstellt |
| 28.04.2026 | Frontend komplett von localStorage auf PHP-API migriert |
| 28.04.2026 | Build deployed via WebFTP (`index-BL1nosi8.js`, `index-CvGTQ7so.css`) |
| 29.04.2026 | App lädt kurzzeitig (Logs zeigen Navigation durch alle Seiten) |
| 29.04.2026 | Server down nach Froxlor-Domain-Edit um 07:38 — noch nicht behoben |

---

*Letztes Update: 29.04.2026 | Autor: Claude (Anthropic) + Markus Freckmann*
