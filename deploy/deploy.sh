#!/bin/sh
# Builds the web app here, then installs or updates everything on the VM. Safe to re-run: guests and
# bookmarks live outside the upload. Usage: deploy/deploy.sh <vm-ip> <ssh-key-path>
set -eu

VM="ubuntu@$1"
KEY="$2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH="ssh -i $KEY"

# An empty API URL makes the web app call /api on whatever address served it.
(cd "$ROOT/client" && npm ci --silent && VITE_API_URL= npx vite build --logLevel error)

$SSH "$VM" 'sudo mkdir -p /opt/brogrammers /var/www/brogrammers /var/lib/brogrammers && sudo chown -R ubuntu: /opt/brogrammers /var/www/brogrammers /var/lib/brogrammers'
rsync -az --delete -e "$SSH" --exclude .venv --exclude models --exclude __pycache__ --exclude 'data/guests.*' "$ROOT/backend/" "$VM:/opt/brogrammers/backend/"
rsync -az --delete -e "$SSH" "$ROOT/client/dist/" "$VM:/var/www/brogrammers/"
scp -q -i "$KEY" "$ROOT/deploy/nginx.conf" "$ROOT/deploy/brogrammers.service" "$VM:/tmp/"

$SSH "$VM" 'sh -s' <<'REMOTE'
set -eu
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq nginx python3-venv iptables-persistent >/dev/null

cd /opt/brogrammers/backend
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt
.venv/bin/python build_index.py 2>/dev/null

sudo mv /tmp/brogrammers.service /etc/systemd/system/brogrammers.service
sudo mv /tmp/nginx.conf /etc/nginx/sites-available/brogrammers
sudo ln -sf /etc/nginx/sites-available/brogrammers /etc/nginx/sites-enabled/brogrammers
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t -q

# Oracle's Ubuntu images reject everything but SSH in their own firewall as well.
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save >/dev/null

sudo systemctl daemon-reload
sudo systemctl enable -q brogrammers nginx
sudo systemctl restart brogrammers nginx
REMOTE
