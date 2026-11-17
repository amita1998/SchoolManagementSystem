# Vision Valley School Management System (VVS)

Web application for a single school (Nursery to Class 12, academic year April–March,
English only). React + Express + PostgreSQL.

> Build status: **Steps 1–6 of 9 complete** — setup/schema/seed, authentication, dashboard shell,
> student/teacher/class/subject management, attendance with the correction workflow, and
> examinations → marks → report cards.
> Fees are Step 7.

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

## 7. Dashboards (Step 3)

One endpoint per role — the server decides the shape, the client never asks for another role:

| Method | Path | Scope |
|---|---|---|
| GET | `/api/dashboard/admin` | whole school |
| GET | `/api/dashboard/teacher` | classes/subjects assigned in the current academic year |
| GET | `/api/dashboard/student` | the signed-in student only |
| GET | `/api/dashboard/parent?childId=` | children linked to the account; another child → `403 CHILD_FORBIDDEN` |

Each payload carries `cards`, role-specific lists and a shared `shell` block (user, month
calendar, reminders, notices, unread notification count) so one request fills all three zones.

Layout (`frontend/src/layouts/DashboardLayout.jsx`): sidebar 232 px · centre column · right panel
292 px. At ≤1280 px the right panel moves below the centre, at ≤820 px the sidebar becomes a
horizontal strip and everything stacks. Colours, radii and shadows are the tokens in
`frontend/src/styles/global.css` (`#5F6DB0`, `#EE8791`, `#2D3156`, canvas `#F1F2F8`, Mulish).

Navigation is filtered by the same permission strings the server enforces, and every module that
is not built yet says which step it arrives in — there are no dead links and no fake numbers.

## 8. Management API (Step 4)

| Area | Endpoints |
|---|---|
| Students | `GET/POST /api/students`, `GET/PUT/DELETE /api/students/:id`, `POST /:id/status`, `POST /:id/reset-password`, `POST /:id/documents`, `GET/DELETE /api/students/documents/:docId` |
| Teachers | `GET/POST /api/teachers`, `GET/PUT/DELETE /api/teachers/:id`, `POST /:id/status`, `PUT /:id/assignments`, `POST/DELETE /:id/class-teacher`, `POST /:id/reset-password` |
| Academics | `GET /api/academics/options`, `GET/POST/PUT/DELETE /api/academics/classes`, `POST /api/academics/classes/:id/sections`, `PUT/DELETE /api/academics/sections/:id`, `GET/POST/PUT/DELETE /api/academics/subjects`, `PUT /api/academics/classes/:id/subjects`, `GET/POST /api/academics/years`, `POST /api/academics/years/:id/current` |

**Admission** is a single `multipart/form-data` request: a `payload` JSON field plus up to five
`documents` (PDF/JPG/PNG, 5 MB each) and a parallel `documentTypes` array. One transaction creates
the student, its login (`username = Admission ID`), the enrollment, the guardian records, the
document rows and the first status-history row. The response carries the temporary password, which
is never retrievable again.

Behaviour worth knowing:

* Admission / employee / receipt numbers come from database sequences; a client-supplied
  `admissionId` is ignored.
* A guardian whose email or mobile already exists is attached to the same family account, so
  siblings share one parent login.
* Status changes append to `student_status_history`, and a leaving status disables the login.
* Deleting is a soft delete; the row and its history stay for reports.
* `23505` unique violations are mapped to `409` codes (`SECTION_EXISTS`, `TEACHER_ALREADY_CLASS_TEACHER`,
  `CLASS_EXISTS`, …) instead of leaking a database error.
* A teacher who is still a class teacher cannot be deactivated or deleted.

## 9. Attendance & examinations (Steps 5–6)

**Attendance**

| Method | Path | Who |
|---|---|---|
| GET | `/api/attendance/sections` | teacher — sections where they are class teacher |
| GET | `/api/attendance/sheet?sectionId&date` | class teacher (editable) / admin (read-only) |
| POST | `/api/attendance/mark` | class teacher only |
| GET | `/api/attendance` | role-scoped list + summary |
| GET | `/api/attendance/summary/:studentId` (or `me`) | student own / parent child / staff |
| POST | `/api/attendance/corrections` | class teacher |
| GET | `/api/attendance/corrections` | admin (all) / teacher (own) |
| POST | `/api/attendance/corrections/:id/review` | admin |

One row per student per day. Today is editable until 23:59 IST; a past day returns
`409 ATTENDANCE_LOCKED` and the change must go through a correction request that an admin
approves or rejects. Both the old and the new value are kept with the requester and reviewer.
Percentage = `(present + late + half-day × 0.5) / marked days`; holidays never enter the
denominator because no row exists for them.

**Examinations**

| Method | Path | Who |
|---|---|---|
| GET/POST | `/api/exams` | admin (list/create) |
| GET | `/api/exams/mine` | teacher — papers for their classes/subjects |
| POST | `/api/exams/:id/schedules` | admin |
| POST | `/api/exams/:id/publish` | admin — refused until every paper is fully entered |
| GET/PUT | `/api/exams/marks/:scheduleId` | teacher of that class+subject / admin |
| POST | `/api/exams/marks/:scheduleId/unlock` | admin |
| POST | `/api/exams/marks/:scheduleId/override` | admin, reason required, audited |
| GET | `/api/exams/results/student/:id` (or `me`) | own / children / staff |
| GET | `/api/exams/results/class/:classId/exam/:examId` | admin / teacher |

Marks move `draft → submitted`; a submitted paper is read-only for the teacher until an admin
unlocks it, and an admin override demands a reason and writes old + new values to the audit log.
Students and parents can only read an exam after it is published, and only their own card.

## 10. Tests

```bash
# one-time: a separate database so tests never touch dev data
createdb -h 127.0.0.1 -p 5434 -U vvs vvs_test
cd backend && DATABASE_URL=postgresql://vvs@127.0.0.1:5434/vvs_test npm run migrate
npm test          # 71 tests (auth + dashboards + management + attendance + exams), ~20 s
```

`tests/support/testEnv.js` pins `NODE_ENV=test` and the `vvs_test` URL **before** anything imports
the config, and `tests/support/db.js` truncates every business table between runs. Two fixture sets
exist: `fixtures.js` (one account per role plus throwaway accounts for the destructive cases) and
`academicFixtures.js` (a miniature school: Class 5 A/B, two students, one parent each, attendance,
one published exam with a mark).

Covered now: login per role, wrong password, unknown account, role mismatch, 5-attempt lockout,
missing/invalid token, the forced-password-change gate, refresh rotation + replay detection,
logout revocation, password change, audit rows, the append-only audit trigger, and dashboard
scoping — including a parent asking for another parent's child (`403`) and each role calling
another role's dashboard (`403`). Step 4 adds: admission (student + login + guardian + document in
one call), sequential IDs, file-type rejection, server-side search/filter/pagination, status
persistence, a student reading another student's record (`403`), teacher creation, the
one-section-per-teacher rule, the class-teacher deactivation guard, and subject-deletion guards.
Steps 5–6 add: the attendance lock for a past day, the admin-cannot-mark rule, the correction
approve/reject lifecycle, the percentage formula, marks out of range, submit-incomplete, teacher
scope on a paper they do not teach, the publish gate, and the override audit trail.

## 11. Roadmap

1. ✅ Setup, schema, migrations, seed
2. ✅ Authentication, roles, common login page
3. ✅ Layout shell + four dashboards
4. ✅ Student, teacher, class, subject management
5. ✅ Attendance + correction workflow
6. ✅ Examinations, marks, report cards
7. Fees and receipts
8. Events, announcements, notifications, assignments, timetable
9. Reports, settings, audit log
10. Testing and deployment notes
