#!/usr/bin/env bash
# Deploy Thermopolium to https://iamai.kg/thermopolium/ on the `hk` box.
#
#   deploy/deploy.sh                 dry run — prints every step, changes nothing
#   deploy/deploy.sh --yes           build, rsync, install deps, seed the event, (re)start under pm2
#   deploy/deploy.sh --yes --nginx   …and install the nginx snippet (never edits iamai.kg.conf itself)
#
# Layout on hk:   /var/www/thermopolium/          static build (nginx serves it)
#                 /opt/thermopolium/server/       Node API (+ .env, node_modules — never overwritten)
#                 /var/lib/thermopolium/          SQLite database — never touched by rsync
# One-time, by hand: add `include /etc/nginx/snippets/thermopolium.conf;` to the iamai.kg server block,
# `nginx -t && nginx -s reload`, and in BotFather run /setdomain → iamai.kg.
set -euo pipefail

HOST=${HOST:-hk}
APP=$(cd "$(dirname "$0")/.." && pwd)
WEB=/var/www/thermopolium
SRV=/opt/thermopolium/server
DATA=/var/lib/thermopolium
YES=0; NGINX=0
for a in "$@"; do case "$a" in --yes) YES=1;; --nginx) NGINX=1;; *) echo "unknown flag $a"; exit 1;; esac; done

run() { echo "+ $*"; [ "$YES" = 1 ] && "$@" || true; }
remote() { echo "+ ssh $HOST $*"; [ "$YES" = 1 ] && ssh "$HOST" "$@" || true; }
[ "$YES" = 1 ] || echo "DRY RUN — pass --yes to execute"

cd "$APP"
run npm run build
remote "mkdir -p $WEB $SRV $DATA && chmod 700 $DATA"

# Static site. --delete is safe: it only owns $WEB.
run rsync -az --delete dist/ "$HOST:$WEB/"

# API code. .env, node_modules and any database are excluded, so --delete can't remove them.
run rsync -az --delete --exclude node_modules --exclude '.env' --exclude '*.db' --exclude '*.db-*' server/ "$HOST:$SRV/"
run rsync -az deploy/ecosystem.config.cjs "$HOST:/opt/thermopolium/ecosystem.config.cjs"
run rsync -az deploy/thermopolium.env.example "$HOST:/opt/thermopolium/thermopolium.env.example"
remote "cd $SRV && npm ci --omit=dev"

# First deploy: create .env from the template and stop, so nothing starts half-configured.
if [ "$YES" = 1 ] && ! ssh "$HOST" "test -f $SRV/.env"; then
  ssh "$HOST" "cp /opt/thermopolium/thermopolium.env.example $SRV/.env && chmod 600 $SRV/.env"
  echo "Created $SRV/.env from the template. Fill it in (BOT_TOKEN, ADMIN_USERNAMES, …) and re-run."
  exit 0
fi

# Seed BEFORE the first start: with an empty events table the server would insert its demo events instead.
remote "cd $SRV && DB_PATH=$DATA/thermopolium.db node --disable-warning=ExperimentalWarning seed-thermopolium.mjs"
remote "pm2 startOrReload /opt/thermopolium/ecosystem.config.cjs --update-env && pm2 save"

if [ "$NGINX" = 1 ]; then
  run rsync -az deploy/nginx-thermopolium.conf "$HOST:/etc/nginx/snippets/thermopolium.conf"
  remote "grep -q 'snippets/thermopolium.conf' /etc/nginx/conf.d/iamai.kg.conf && echo 'include already present' || echo 'ADD to the iamai.kg server block:  include /etc/nginx/snippets/thermopolium.conf;   then: nginx -t && nginx -s reload'"
fi

# Smoke test. A 200 with text/html on an API path means it fell through to the landing page.
run curl -s -o /dev/null -w '%{http_code} %{content_type}  ← site\n' https://iamai.kg/thermopolium/
run curl -s -w '\n%{http_code} %{content_type}  ← api (must be application/json)\n' https://iamai.kg/thermopolium/api/therm/config
