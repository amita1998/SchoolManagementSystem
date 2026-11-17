# Deployment notes — Vision Valley School Management System

These notes take the repository from a laptop to a single-server production install.
Nothing here is optional for a school that depends on the data.

## 1. What runs

| Piece | Technology | Port (default) |
|---|---|---|
| API | Node 20+ / Express | 4000 |
| UI | Static build of the Vite/React app | served by nginx |
| Database | PostgreSQL 15+ | 5432 |

Node 18 is enough for the code, but 20 LTS is the tested target (`node -v`).

## 2. Server preparation

```bash
sudo adduser --system --group vvs
sudo mkdir -p /srv/vvs && sudo chown -R vvs:vvs /srv/vvs
sudo -u postgres createuser --pwprompt vvs
sudo -u postgres createdb --owner=vvs vvs_prod
```

PostgreSQL settings worth setting explicitly on a small school server (2–4 GB RAM):

```
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
work_mem = 8MB
max_connections = 60
timezone = 'Asia/Kolkata'
```

The application itself sets `TIME ZONE 'Asia/Kolkata'` where dates matter, but the
cluster should agree so `now()` and backups line up.

## 3. Deploy the code

```bash
sudo -u vvs git clone <repo> /srv/vvs/app
cd /srv/vvs/app/backend
cp .env.example .env && $EDITOR .env      # see section 4
npm ci --omit=dev
npm run migrate                            # applies backend/migrations/*.sql in order
npm run seed                               # reference data + the first admin
```

The seed is idempotent for reference data and **never** creates demo records unless
`SEED_DEMO=true`. On production leave it false.

The first admin comes from `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`. If the password is
empty, the seed generates one and prints it exactly once — write it down. There is no in-app
"forgot password" for an admin: recovery is an operator action on the server, using
`scripts/handover-credentials.js` as the template (it refuses to run with `NODE_ENV=production`),
or `ADMIN_INITIAL_PASSWORD` before the account exists.

### Frontend

```bash
cd /srv/vvs/app/frontend
npm ci
VITE_API_URL=https://school.example.com/api npm run build
# dist/ is the deployable artefact
```

`VITE_API_URL` is baked in at build time. Rebuild when it changes.

## 4. Environment (.env)

| Key | Notes |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DATABASE_URL` | `postgresql://vvs:***@127.0.0.1:5432/vvs_prod` |
| `CLIENT_ORIGIN` | `https://school.example.com` — must match exactly, CORS is closed otherwise |
| `JWT_ACCESS_SECRET` | 64 random bytes, hex or base64 |
| `JWT_REFRESH_SECRET` | a different 64 random bytes |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | `7` (30 when "remember me" is ticked) |
| `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` | first admin only, used once |
| `SEED_DEMO` | `false` |
| `UPLOAD_DIR` | `storage/uploads` (resolved against `backend/`) |
| `MAX_UPLOAD_MB` | `5` |

Generate secrets with `openssl rand -hex 64`. Never commit `.env`; the file is git-ignored.

## 5. Run the API under systemd

`/etc/systemd/system/vvs-api.service`:

```ini
[Unit]
Description=VVS API
After=network.target postgresql.service

[Service]
Type=simple
User=vvs
WorkingDirectory=/srv/vvs/app/backend
EnvironmentFile=/srv/vvs/app/backend/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vvs-api
curl -sS localhost:4000/api/health     # {"status":"ok","database":"vvs_prod"}
```

## 6. nginx

```nginx
server {
    listen 443 ssl http2;
    server_name school.example.com;

    ssl_certificate     /etc/letsencrypt/live/school.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/school.example.com/privkey.pem;

    client_max_body_size 12m;          # 6 documents × 5 MB is not a single request, but be generous

    root /srv/vvs/app/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    location / {
        try_files $uri /index.html;     # React Router needs this
    }

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Strict-Transport-Security "max-age=31536000" always;
}
```

Terminate TLS at nginx and keep the API on loopback. The refresh cookie is `httpOnly`,
`SameSite=Lax`, `Secure` in production — plain HTTP would silently break sign-in.

## 7. Backups (do this before the school enters data)

```bash
# nightly at 01:30
30 1 * * * pg_dump -Fc vvs_prod | gzip > /srv/backups/vvs_prod-$(date +\%F).dump.gz
```

- Keep 30 daily + 12 monthly copies, off the server (school NAS or object storage).
- Uploaded documents live under `backend/storage/uploads/` (`UPLOAD_DIR`); back that directory up
  with the DB.
- **Restore test every term:** `createdb vvs_restore && gunzip -c … | pg_restore -d vvs_restore`
  then point a copy of the API at it and sign in. An untested backup is not a backup.

RPO with nightly dumps is one day; RTO is roughly one hour on the same hardware.

## 8. Upgrades

```bash
cd /srv/vvs/app
git pull
cd backend && npm ci --omit=dev && npm run migrate
cd ../frontend && npm ci && VITE_API_URL=… npm run build
sudo systemctl restart vvs-api
```

Migrations are checksum-locked: editing an applied file is an error, not a silent change.
Add a new file instead. Destructive column drops happen only after two releases have
stopped reading them.

## 9. Smoke test after every deploy

1. `GET /api/health` → `ok`.
2. Sign in as admin → dashboard shows student/teacher counts.
3. Sign in as a teacher → mark attendance for one section on today's date.
4. Sign in as a parent → child switcher lists the children, fees visible.
5. Open `/admin/audit` → the sign-ins and the attendance save are listed.
6. Try `/admin/students` in a student session → redirected to `/unauthorized`.

## 10. Operational notes

- **Time zone:** Asia/Kolkata everywhere. Attendance locks at the time set in Settings
  (default 23:59 IST) — the server compares against the database clock, not the browser.
- **Receipts:** sequential and never reused. A mistake is a reversal entry; deleting rows
  from `fee_payments`/`fee_receipts` will break the ledger and the guard triggers.
- **Audit log:** append-only at the database level (`audit_logs` rejects UPDATE/DELETE).
- **Uploads:** PDF/JPG/PNG, 5 MB each, up to five documents per admission (multer also caps any
  request at six files). Files are stored under `backend/storage/uploads/` (`UPLOAD_DIR`) with a
  generated name; the download route checks the session and the caller's permissions, never a public
  path.
- **Rate limiting:** 5 failed logins lock the account for 15 minutes. Unlock early by
  clearing `locked_until` for that user.
