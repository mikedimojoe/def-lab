# DEF LAB — Deployment Status & Next Steps

> Zuletzt aktualisiert: 2026-05-04  
> Weitermachen ab Mac — alles was du wissen musst steht hier.

---

## Aktueller Stand

### Server
- **Hetzner VPS** — IP: `178.105.58.10`, CPX22, Nürnberg
- **OS**: Ubuntu 24.04 LTS
- **Apache2**: läuft ✅ (gestartet um 11:57 UTC)
- **SSH**: gestartet (`systemctl start ssh` wurde ausgeführt) — aber noch kein Zugang weil authorized_keys fehlt

### Was noch NICHT funktioniert
- SSH-Zugang vom PC (kein passender Private Key gefunden)
- Deployment von GitHub Actions → Hetzner (läuft aktuell noch auf GitHub Pages)
- def-lab.de zeigt zwar auf Hetzner, aber Apache serviert noch nicht die App

### GitHub
- Repo: `https://github.com/mikedimojoe/def-lab`
- Secret `VITE_API_URL` = `https://def-lab.de` ✅ gesetzt
- GitHub Actions deployt aktuell auf **GitHub Pages** (nutzlos, da DNS auf Hetzner zeigt)

---

## Ziel-Architektur

```
git push → GitHub Actions → baut Frontend (npm run build)
                          → deployt per SSH auf Hetzner
Hetzner Apache → / (Frontend dist/)
               → /api (PHP Backend)
```

---

## Schritt-für-Schritt was als nächstes zu tun ist

### 1. SSH-Zugang bekommen (ERSTE PRIORITÄT)

**Option A — Mac hat vielleicht den Original-Key!**
Der Server wurde vor 5 Tagen erstellt mit SSH-Key `def-lab-hetzner`.
Wenn der Server vom Mac erstellt wurde, liegt der private Key dort:
```bash
ls ~/.ssh/
# Suche nach: def-lab, def-lab-hetzner, id_ed25519, id_rsa o.ä.
```
Wenn gefunden → testen:
```bash
ssh -i ~/.ssh/KEYNAME root@178.105.58.10
```

**Option B — Passwort-Auth in Hetzner-Konsole aktivieren**
1. Hetzner Dashboard → Server def-lab → Aktionen → Konsole
2. Login: `root` / Passwort: `gFchseNKA4Uq` (Rescue/Root-Passwort)
3. In nano (Tab-Vervollständigung nutzen!):
   ```
   nano /etc/ssh/sshd
   ```
   → Tab-Taste drücken → öffnet sshd_config
4. Strg+W → `PasswordAuthentication` suchen → auf `yes` setzen
5. Strg+X → Y → Enter
6. `passwd` (Root-Passwort setzen)
7. `systemctl restart ssh`
8. Dann vom Mac: `ssh root@178.105.58.10`

**Option C — Neuen SSH Key auf Mac generieren und in Konsole einfügen**
```bash
# Auf Mac:
ssh-keygen -t ed25519 -f ~/.ssh/def-lab -N ""
cat ~/.ssh/def-lab.pub
```
Dann in Hetzner-Konsole:
```bash
echo 'ssh-ed25519 DEIN-KEY-HIER' > /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```
⚠️ ACHTUNG: In der Hetzner-Konsole werden `_` → `-` und `>` → `.` umgewandelt (Tastaturlayout-Bug).
Trick: Tab-Taste für Dateinamen-Vervollständigung nutzen.

---

### 2. Server einrichten (nach SSH-Zugang)

```bash
# PHP installieren (falls nicht vorhanden)
apt update && apt install -y php libapache2-mod-php php-mysql

# Apache Web-Root prüfen
ls /var/www/html/

# Apache Config für SPA + PHP API
cat /etc/apache2/sites-enabled/000-default.conf
```

Apache VirtualHost soll so aussehen:
```apache
<VirtualHost *:80>
    ServerName def-lab.de
    DocumentRoot /var/www/def-lab

    # PHP API
    <Directory /var/www/def-lab/api>
        Options -Indexes
        AllowOverride All
    </Directory>

    # SPA Routing (alle Routen → index.html)
    <Directory /var/www/def-lab>
        Options -Indexes
        FallbackResource /index.html
    </Directory>
</VirtualHost>
```

```bash
# Verzeichnis anlegen
mkdir -p /var/www/def-lab/api

# Frontend deployen (einmalig manuell zum Testen)
# dist/ Inhalt hochladen nach /var/www/def-lab/
```

---

### 3. HTTPS einrichten (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-apache
certbot --apache -d def-lab.de
```

---

### 4. GitHub Actions Workflow aktualisieren

Die Datei `.github/workflows/deploy-frontend.yml` muss von GitHub Pages auf Hetzner SSH umgestellt werden.

**Neuer Workflow** (ersetze den alten):
```yaml
name: Deploy Frontend → Hetzner

on:
  push:
    branches: [master]
    paths: ["frontend/**"]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Build
        run: npm run build
        working-directory: frontend
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy to Hetzner via SSH
        uses: appleboy/scp-action@v0.1.7
        with:
          host: 178.105.58.10
          username: root
          key: ${{ secrets.HETZNER_SSH_KEY }}
          source: "frontend/dist/*"
          target: "/var/www/def-lab"
          strip_components: 2
```

**GitHub Secret `HETZNER_SSH_KEY`** muss noch gesetzt werden:
```bash
# Auf Mac — private key ausgeben:
cat ~/.ssh/def-lab
# Oder cat ~/.ssh/def-lab-hetzner (je nachdem welcher key existiert)
```
→ Kompletten Inhalt (inkl. `-----BEGIN...` und `-----END...`) bei GitHub eintragen:
→ github.com/mikedimojoe/def-lab → Settings → Secrets → Actions → New secret
→ Name: `HETZNER_SSH_KEY`

---

### 5. PHP Backend auf Hetzner

Die PHP-Dateien liegen im Repo unter `backend/` oder `api/` — prüfen:
```bash
ls /var/www/def-lab/api/
# oder im Repo: ls backend/ oder ls api/
```

Die PHP-Dateien müssen nach `/var/www/def-lab/api/` auf dem Server.

---

## Wichtige Zugangsdaten (NUR LOKAL HALTEN!)

| Was | Wert |
|-----|------|
| Hetzner Server IP | `178.105.58.10` |
| SSH Login | `root` |
| Hetzner Konsolen-Passwort | `gFchseNKA4Uq` |
| GitHub Repo | `https://github.com/mikedimojoe/def-lab` |
| VITE_API_URL Secret | `https://def-lab.de` ✅ |
| HETZNER_SSH_KEY Secret | ❌ noch nicht gesetzt |

---

## Generierter SSH Key (Windows PC — nicht mehr relevant wenn Mac verwendet)

```
Public Key:
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINSvycEK+Dy/Dfv1IV9GXtXL5ghm7S9DGkJpOkm/Y7ul

Private Key Pfad (Windows):
C:\Users\freckmanma\.ssh\def-lab
```

Auf dem Mac lieber einen neuen Key generieren (Option C oben).
