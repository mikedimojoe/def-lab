# DEF LAB — Deployment Notes
> Zuletzt aktualisiert: 2026-05-13 (Windows-Session)

---

## 🍎 MAC TODO — NUR DIESE 2 SCHRITTE FEHLEN NOCH

### Schritt 1 — GitHub Actions SSH freischalten (2 min)

```bash
ssh root@178.105.58.10

echo 'AuthorizedKeysFile /root/.ssh/authorized-keys' > /etc/ssh/sshd_config.d/99-authkeys.conf
systemctl restart ssh

exit
```

### Schritt 2 — Server einrichten & App deployen (5 min)

```bash
cd ~/path/to/def-lab
bash scripts/setup-server.sh
```

Das Script macht alles: Apache, PHP, MySQL, SSL (Let's Encrypt), Frontend + Backend deployen.

### Danach prüfen

```bash
curl -s https://def-lab.de | head -3
# Soll zurückgeben: <!DOCTYPE html>
```

---

## Was ab dann automatisch passiert

```
git push  →  GitHub Actions  →  SSH  →  Hetzner
```

- `frontend/**` geändert → Frontend deployt nach `/var/www/def-lab/`
- `backend/api/**` geändert → Backend deployt nach `/var/www/def-lab/api/`

Kein manuelles SSH mehr nötig.

---

## Was in der Windows-Session heute erledigt wurde ✅

- **Live-Tagging Fix**: Play Type Hot-Buttons schreiben jetzt korrekt in `PLAY TYPE CALLED` (nicht mehr `PLAY TYPE`)
- **`backend/api/settings.php`** neu angelegt (fehlte, AppearanceContext warf 404)
- **`settings`-Tabelle** in `backend/api/setup.php` ergänzt
- **GitHub Actions** auf Hetzner SSH-Deploy umgestellt (war vorher GitHub Pages — nutzlos da DNS auf Hetzner zeigt)
  - `.github/workflows/deploy-frontend.yml` → baut React-App, deployt per SCP auf Hetzner
  - `.github/workflows/deploy-backend.yml` → kopiert PHP-Dateien per SCP auf Hetzner
- **GitHub Secrets** gesetzt:
  - `HETZNER_HOST` = `178.105.58.10` ✅
  - `HETZNER_SSH_KEY` = neuer Ed25519-Key (kein `+`/`/` im Public Key, noVNC-kompatibel) ✅
  - `VITE_API_URL` = `https://def-lab.de` ✅
- **SSH auf Hetzner** läuft und startet automatisch beim Booten (`systemctl enable ssh`)
- **Neuer GitHub-Actions-Key** liegt in `/root/.ssh/authorized-keys` auf dem Server
- **`scripts/setup-server.sh`** — einmaliges Server-Setup-Script

## Was noch offen ist ❌

- `AuthorizedKeysFile`-Direktive fehlt → **Schritt 1 oben** (geht nur von Mac, Firmennetz blockt Port 22)
- Initialer Server-Setup (Apache, MySQL, SSL) → **Schritt 2 oben**

---

## Server & Zugangsdaten

| Was | Wert |
|-----|------|
| Hetzner IP | `178.105.58.10` |
| SSH | `ssh root@178.105.58.10` (Mac-Key funktioniert) |
| Web-Root | `/var/www/def-lab/` |
| API-Pfad | `/var/www/def-lab/api/` |
| DB Name/User | `deflab` / `deflab` |
| DB Pass | `DefLab2024!` |
| Domain | `https://def-lab.de` |
| GitHub Repo | `https://github.com/mikedimojoe/def-lab` |

## SSH-Keys

| Key | Zweck |
|-----|-------|
| `~/.ssh/???` (Mac) | Original Hetzner-Key — SSH funktioniert sofort |
| `C:\Users\freckmanma\.ssh\def-lab-actions` (Windows) | GitHub Actions Key |

GitHub Actions Public Key (liegt bereits in `/root/.ssh/authorized-keys` auf dem Server):
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG4GEiJ9O4fPsltHyPNBwGg6pFLaYpXIhaNVGSHziV7C
```

---

## Hetzner noVNC-Konsole — bekannte Keyboard-Bugs

Beim Einfügen per Clipboard werden folgende Zeichen falsch übertragen:
- `_` → `-`
- `>` → `.`
- `(` → `9`
- `)` → `0`
- `+` → `=`
- `|` → `\` oder Zeilenumbruch
- `https://` → wird am `:` getrennt (bash versucht `//raw...` als Pfad auszuführen)

**Workaround**: Sonderzeichen direkt tippen statt einfügen, oder nano für Datei-Bearbeitung verwenden.
