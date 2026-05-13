#!/bin/bash
# Einmaliges SSH-Fix-Script — wird via curl aus der Hetzner-Console gestartet
# curl -s https://raw.githubusercontent.com/mikedimojoe/def-lab/master/scripts/fix-ssh.sh | bash

set -e

AUTHORIZED="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINSvycEK+Dy/Dfv1IV9GXtXL5ghm7S9DGkJpOkm/Y7ul"

mkdir -p /root/.ssh
chmod 700 /root/.ssh

# Neuen Key eintragen (falls noch nicht vorhanden)
if ! grep -qF "$AUTHORIZED" /root/.ssh/authorized_keys 2>/dev/null; then
    echo "$AUTHORIZED" >> /root/.ssh/authorized_keys
    echo "Key eingetragen"
else
    echo "Key war bereits vorhanden"
fi

chmod 600 /root/.ssh/authorized_keys

# Fehlerhafte sshd_config-Zeile entfernen (authorized-keys mit Bindestrich)
sed -i '/authorized-keys/d' /etc/ssh/sshd_config

# SSH neu starten
systemctl restart ssh

echo "Fertig! SSH-Key eingetragen und sshd neu gestartet."
