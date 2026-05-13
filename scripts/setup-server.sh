#!/usr/bin/env bash
# =============================================================================
# DEF LAB — Einmaliges Server-Setup-Script
# Ausführen vom Mac: bash scripts/setup-server.sh
# Voraussetzung: SSH-Zugang zu root@178.105.58.10
# =============================================================================

set -e
SERVER="root@178.105.58.10"
WEBROOT="/var/www/def-lab"
DB_NAME="deflab"
DB_USER="deflab"
DB_PASS="DefLab2024!"
DOMAIN="def-lab.de"

echo "🚀 DEF LAB Server Setup — $SERVER"
echo ""

# ---------------------------------------------------------------------------
# 1. System-Pakete
# ---------------------------------------------------------------------------
echo "📦 Installiere Pakete..."
ssh "$SERVER" bash <<'ENDSSH'
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  apache2 \
  php8.3 libapache2-mod-php8.3 \
  php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl \
  mysql-server \
  certbot python3-certbot-apache \
  rsync
a2enmod rewrite php8.3
systemctl enable apache2 mysql
systemctl start apache2 mysql
echo "✅ Pakete installiert"
ENDSSH

# ---------------------------------------------------------------------------
# 2. MySQL Datenbank & User
# ---------------------------------------------------------------------------
echo "🗄️  Richte MySQL ein..."
ssh "$SERVER" bash <<ENDSSH
mysql -u root <<'MYSQL'
CREATE DATABASE IF NOT EXISTS deflab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'deflab'@'localhost' IDENTIFIED BY 'DefLab2024!';
GRANT ALL PRIVILEGES ON deflab.* TO 'deflab'@'localhost';
FLUSH PRIVILEGES;
MYSQL
echo "✅ MySQL: Datenbank 'deflab' und User 'deflab' angelegt"
ENDSSH

# ---------------------------------------------------------------------------
# 3. Verzeichnisse anlegen
# ---------------------------------------------------------------------------
echo "📁 Lege Verzeichnisse an..."
ssh "$SERVER" "mkdir -p $WEBROOT/api && chown -R www-data:www-data $WEBROOT && chmod -R 755 $WEBROOT"
echo "✅ $WEBROOT/api angelegt"

# ---------------------------------------------------------------------------
# 4. Apache VirtualHost konfigurieren
# ---------------------------------------------------------------------------
echo "⚙️  Konfiguriere Apache..."
ssh "$SERVER" bash <<ENDSSH
cat > /etc/apache2/sites-available/def-lab.conf <<'APACHECONF'
<VirtualHost *:80>
    ServerName def-lab.de
    ServerAlias www.def-lab.de
    DocumentRoot /var/www/def-lab

    # PHP API — .php Dateien normal ausführen
    <Directory /var/www/def-lab/api>
        Options -Indexes
        AllowOverride All
        Require all granted
        DirectoryIndex index.php
    </Directory>

    # SPA Routing — alle anderen Routen → index.html
    <Directory /var/www/def-lab>
        Options -Indexes
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>

    # Logs
    ErrorLog \${APACHE_LOG_DIR}/def-lab-error.log
    CustomLog \${APACHE_LOG_DIR}/def-lab-access.log combined
</VirtualHost>
APACHECONF

a2dissite 000-default.conf 2>/dev/null || true
a2ensite def-lab.conf
apache2ctl configtest && systemctl reload apache2
echo "✅ Apache konfiguriert und neu geladen"
ENDSSH

# ---------------------------------------------------------------------------
# 5. PHP-Backend deployen (aus dem Repo)
# ---------------------------------------------------------------------------
echo "📤 Lade PHP-Backend hoch..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

rsync -avz --progress "$REPO_ROOT/backend/api/" "$SERVER:$WEBROOT/api/"
ssh "$SERVER" "chown -R www-data:www-data $WEBROOT/api && chmod -R 644 $WEBROOT/api/*.php"
echo "✅ PHP-Dateien hochgeladen"

# ---------------------------------------------------------------------------
# 6. Datenbank-Tabellen anlegen (setup.php aufrufen)
# ---------------------------------------------------------------------------
echo "🗃️  Erstelle DB-Tabellen..."
ssh "$SERVER" "php $WEBROOT/api/setup.php && echo '✅ DB-Tabellen angelegt' || echo '⚠️  setup.php Fehler — manuell prüfen'"

# ---------------------------------------------------------------------------
# 7. Frontend deployen (build lokal, dann hochladen)
# ---------------------------------------------------------------------------
echo "🏗️  Baue Frontend..."
cd "$REPO_ROOT/frontend"
VITE_API_URL="https://def-lab.de" npm run build
rsync -avz --progress --delete "$REPO_ROOT/frontend/dist/" "$SERVER:$WEBROOT/"
ssh "$SERVER" "chown -R www-data:www-data $WEBROOT && find $WEBROOT -name '*.html' -exec chmod 644 {} \;"
echo "✅ Frontend deployed"

# ---------------------------------------------------------------------------
# 8. HTTPS / Let's Encrypt
# ---------------------------------------------------------------------------
echo ""
echo "🔒 Möchtest du jetzt SSL einrichten? (def-lab.de muss bereits auf $SERVER zeigen)"
read -r -p "SSL einrichten? [j/N] " answer
if [[ "$answer" =~ ^[jJyY]$ ]]; then
    ssh "$SERVER" "certbot --apache -d def-lab.de -d www.def-lab.de --non-interactive --agree-tos -m admin@def-lab.de"
    echo "✅ SSL eingerichtet"
else
    echo "⏭️  SSL übersprungen — später: ssh $SERVER certbot --apache -d def-lab.de"
fi

# ---------------------------------------------------------------------------
# Fertig
# ---------------------------------------------------------------------------
echo ""
echo "========================================="
echo "✅ DEF LAB Setup abgeschlossen!"
echo "   https://def-lab.de"
echo "========================================="
echo ""
echo "Nächste Schritte:"
echo "1. GitHub Secret HETZNER_SSH_KEY setzen:"
echo "   cat ~/.ssh/def-lab  # oder dein Key-Name"
echo "   → github.com/mikedimojoe/def-lab → Settings → Secrets → Actions"
echo "2. GitHub Secret HETZNER_HOST = 178.105.58.10 setzen"
echo "3. Danach deployt jeder 'git push' automatisch 🚀"
