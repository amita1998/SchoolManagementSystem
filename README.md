# Vision Valley School Management System (VVS)

Web application for a single school (Nursery to Class 12, academic year April–March,
English only). React + Express + PostgreSQL.

> Build status: **Step 1 of 9 complete** — project setup, database schema, migrations and seed.
> Auth, layouts and dashboards are the next steps. See "Roadmap" at the bottom.

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

No credentials are hard-coded. Accounts are created by the seed script:

* **Admin** — `ADMIN_EMAIL` from `backend/.env`. If `ADMIN_INITIAL_PASSWORD` is blank the seed
  generates one and prints it exactly once; that account must change its password at first login.
* **Demo teacher / student / parent** — only when `SEED_DEMO=true` (refused in production).
  Password is `DEMO_PASSWORD` from `.env`. Student usernames are their Admission IDs
  (`VVS-000001` …), parents use their email, a parent account can hold several children.

Demo families: `rakesh.sharma@example.com` (2 children), `sunita.patel@example.com` (2),
`imran.khan@example.com` (1).

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

## Roadmap

1. ✅ Setup, schema, migrations, seed
2. Authentication, roles, common login page
3. Layout shell + four dashboards
4. Student, teacher, class, subject management
5. Attendance + correction workflow
6. Examinations, marks, report cards
7. Fees and receipts
8. Events, announcements, notifications, assignments, timetable
9. Reports, settings, audit log
10. Testing and deployment notes
