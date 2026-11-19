#!/usr/bin/env bash
# Start the whole dev stack (Postgres 5434 + API 4001 + Vite 5174).
# Idempotent: whatever is already listening is left alone, so it is safe to re-run
# after a reboot, a crash, or a closed terminal.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PGDATA="${VVV_PGDATA:-$HOME/.vvs-pg/data}"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
LOGDIR="${TMPDIR:-/tmp}/vvs-dev"
mkdir -p "$LOGDIR"

port_busy() { ss -lptnH "sport = :$1" 2>/dev/null | grep -q .; }

say() { printf '%-28s %s\n' "$1" "$2"; }

# ---------------------------------------------------------------- 1. Postgres
if pg_isready -h 127.0.0.1 -p 5434 >/dev/null 2>&1; then
  say "postgres :5434" "already running"
else
  # A crash leaves postmaster.pid behind; pg_ctl then refuses to start.
  if [ -f "$PGDATA/postmaster.pid" ]; then
    stale_pid="$(head -1 "$PGDATA/postmaster.pid" 2>/dev/null)"
    if [ -n "$stale_pid" ] && ! kill -0 "$stale_pid" 2>/dev/null; then
      rm -f "$PGDATA/postmaster.pid"
      say "postgres :5434" "cleared stale postmaster.pid ($stale_pid)"
    fi
  fi
  # setsid: start Postgres in its own session. Started straight from a terminal it stays in
  # that shell's process group and dies with it (SIGTERM) — the reason the local DB kept
  # disappearing mid-session.
  setsid "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGDATA/server.log" -o "-p 5434 -k /tmp" start >/dev/null 2>&1
  for _ in $(seq 1 30); do
    pg_isready -h 127.0.0.1 -p 5434 >/dev/null 2>&1 && break
    sleep 0.5
  done
  pg_isready -h 127.0.0.1 -p 5434 >/dev/null 2>&1 \
    && say "postgres :5434" "started" \
    || { say "postgres :5434" "FAILED — see $PGDATA/server.log"; exit 1; }
fi

# --------------------------------------------------------------------- 2. API
if port_busy 4001; then
  say "api :4001" "already running"
else
  ( cd "$ROOT/backend" && setsid nohup node src/server.js >"$LOGDIR/api.log" 2>&1 & )
  for _ in $(seq 1 40); do port_busy 4001 && break; sleep 0.5; done
  port_busy 4001 && say "api :4001" "started (log $LOGDIR/api.log)" \
    || { say "api :4001" "FAILED — tail $LOGDIR/api.log"; exit 1; }
fi

# ---------------------------------------------------------------- 3. Frontend
if port_busy 5174; then
  say "web :5174" "already running"
else
  ( cd "$ROOT/frontend" && setsid nohup npm run dev >"$LOGDIR/web.log" 2>&1 & )
  for _ in $(seq 1 60); do port_busy 5174 && break; sleep 0.5; done
  port_busy 5174 && say "web :5174" "started (log $LOGDIR/web.log)" \
    || { say "web :5174" "FAILED — tail $LOGDIR/web.log"; exit 1; }
fi

echo
echo "  site   http://localhost:5174"
echo "  api    http://localhost:4001/api/health"
echo "  admin  principal@visionvalley.edu.in"
echo
echo "  logs   tail -f $LOGDIR/api.log $LOGDIR/web.log"
