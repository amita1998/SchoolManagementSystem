# Vision Valley School Management System (VVS)

Web application for a single school (Nursery to Class 12, academic year April–March,
English only). React + Express + PostgreSQL.

> Build status: **Steps 1–2 of 9 complete** — project setup, database schema, migrations, seed,
> authentication with server-side role authorization, and the common login page.
> Layout shell and the four dashboards are Step 3.

---

## 1. Requirements

| Tool | Version used |
|---|---|
| Node.js | 22.x (>= 20 required) |
| PostgreSQL | 17 |
| npm | 10.x |

## 2. Local database

The app expects a PostgreSQL instance at `postgresql://vvs@127.0.0.1:5434/vvs_db`.
The repository does **not** contain credentials for any server. Create a local,
isolated cluster once (do not reuse a cluster that belongs to another project):

```bash
mkdir -p ~/.vvs-pg
initdb -D ~/.vvs-pg/data -U vvs --auth=trust --encoding=UTF8 --locale=C.UTF-8
pg_ctl -D ~/.vvs-pg/data -l ~/.vvs-pg/server.log -o "-p 5434 -k /tmp" start
createdb -h 127.0.0.1 -p 5434 -U vvs vvs_db
```

`-k /tmp` is required when the running user cannot write `/var/run/postgresql`.
On a normal server install, create the role and database instead:

```sql
CREATE ROLE vvs LOGIN PASSWORD '<choose one>';
CREATE DATABASE vvs_db OWNER vvs;
```

## 3. Backend

```bash
cd backend
cp .env.example .env
# generate the two secrets
node -e "console.log('JWT_ACCESS_SECRET='+require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET='+require('crypto').randomBytes(48).toString('hex'))"
# paste them into .env, set ADMIN_EMAIL, leave ADMIN_INITIAL_PASSWORD blank to get a
# generated temporary password printed once by the seed

npm install
npm run migrate      # applies backend/migrations/*.sql (checksum-tracked)
npm run seed         # reference data + first admin + demo data
npm run dev          # http://localhost:4001  (GET /api/health)
```

Useful scripts:

| Command | What it does |
|---|---|
| `npm run migrate` | apply pending migrations |
| `npm run migrate:status` | list applied/pending migrations |
| `npm run seed` | idempotent seed (safe to re-run) |
| `npm run db:reset` | **dev only** drop schema, migrate, seed |
| `npm run dev` | start API with `--watch` |

## 4. Frontend

```bash
cd frontend
cp .env.example .env      # optional; /api is proxied to :4001 by Vite
npm install
npm run dev               # http://localhost:5174
```

## 5. Accounts

No credentials are hard-coded and there is no demo data in the development database.

* **Admin** — `ADMIN_EMAIL` from `backend/.env`. If `ADMIN_INITIAL_PASSWORD` is blank the seed
  generates a temporary password and prints it exactly once; that account must change it at first
  login. Set `ADMIN_INITIAL_PASSWORD` to a password you chose yourself and the forced change is
  skipped (it is then not a temporary password).
* **Teacher / student / parent accounts** are created by the Admin from inside the app (Step 4).
  Student usernames are Admission IDs (`VVS-000001` …), parents use their email or mobile, and one
  parent account can hold several children.

Test-only accounts live in the separate `vvs_test` database — see "Tests" below.

## 5a. Authentication API (Step 2)

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | `{ role, identifier, password, rememberMe }` → access token + refresh cookie |
| POST | `/api/auth/refresh` | rotate the refresh cookie, return a fresh access token |
| POST | `/api/auth/logout` | revoke the current session family |
| GET | `/api/auth/me` | current user + permission list |
| GET | `/api/auth/sessions` | active sessions for the signed-in user |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword, confirmPassword }` |

Every error uses one envelope:

```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid credentials…" } }
```

Validation failures add `error.fields` (per-field messages). Behaviour worth knowing:

* the server decides the role from the account and rejects a wrong role selection with
  `403 ROLE_MISMATCH` — but only after the password verifies, so it does not reveal which
  accounts exist;
* 5 failed attempts → `423 ACCOUNT_LOCKED` for 15 minutes;
* a temporary password returns `403 PASSWORD_CHANGE_REQUIRED` from every endpoint except
  `/auth/me`, `/auth/change-password` and `/auth/logout`;
* `Authorization` is checked on the server for every request; the client-side route guards are
  convenience only.

## 6. Project layout

```
SchoolManagmentSystem/
├── backend/
│   ├── migrations/          0001…0010 versioned SQL
│   ├── scripts/             migrate.js, seed.js, db-reset.js
│   └── src/
│       ├── config/          env.js, db.js
│       ├── app.js           express app (helmet, cors, envelope, error handler)
│       └── server.js        http server
├── frontend/
│   └── src/{assets,components,layouts,pages/{auth,admin,teacher,student,parent},
│            routes,services,hooks,context,styles}
├── docs/                    DECISIONS.md (ADR + BRD/prompt conflict resolutions)
└── README.md
```

## 7. Database

44 tables (43 domain tables + `schema_migrations`), see `docs/DECISIONS.md` and the
migration files. Enforced in the database, not only in code:

* `VVS-000001` admission IDs and `VVT-0001` employee IDs come from sequences and are
  immutable (trigger `forbid_immutable_change`).
* `VVS-RCP-000001` receipts come from a sequence, unique, never reused.
* One current academic year (partial unique index).
* One class teacher per section per year; one section per teacher per year.
* One lesson per section/day/period; a teacher cannot be double-booked.
* One attendance row per student per day.
* `audit_logs` is append-only (update/delete raise).
* Soft deletes everywhere (`deleted_at`); nothing is hard-deleted by the app.

## 7. Tests

```bash
# one-time: a separate database so tests never touch dev data
createdb -h 127.0.0.1 -p 5434 -U vvs vvs_test
cd backend && DATABASE_URL=postgresql://vvs@127.0.0.1:5434/vvs_test npm run migrate
npm test          # 17 auth tests, node:test, ~6 s
```

`tests/support/testEnv.js` pins `NODE_ENV=test` and the `vvs_test` URL **before** anything imports
the config, and `tests/support/db.js` truncates every business table between runs. Fixtures create
one account per role (`*@vvs.test`, password `Test@1234`) plus separate throwaway accounts for the
destructive lockout and password-change cases.

Covered now: login per role, wrong password, unknown account, role mismatch, 5-attempt lockout,
missing/invalid token, the forced-password-change gate, refresh rotation + replay detection,
logout revocation, password change, audit rows, and the append-only audit trigger.

## 8. Roadmap

1. ✅ Setup, schema, migrations, seed
2. ✅ Authentication, roles, common login page
3. Layout shell + four dashboards
4. Student, teacher, class, subject management
5. Attendance + correction workflow
6. Examinations, marks, report cards
7. Fees and receipts
8. Events, announcements, notifications, assignments, timetable
9. Reports, settings, audit log
10. Testing and deployment notes
