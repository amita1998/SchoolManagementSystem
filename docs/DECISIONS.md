# Decisions

Two kinds of entries: **ADRs** (technical choices) and **resolutions** (places where the build
prompt and the supplied BRD disagree). Anything marked *default* was chosen because the source
documents do not settle it; change it and this file changes with it.

---

## Resolution R1 — prompt v1.2 wins over BRD v1.1

The build prompt refers to "BRD v1.2", but the document supplied with it is
`Business Requirements Document (BRD).docx` **version 1.1 (Revised Draft)**. Where the two
disagree, the build prompt is treated as the newer instruction. Deltas found so far:

**Status: confirmed by the project owner (17-11-2026).**

| # | Topic | BRD v1.1 | Build prompt (used) |
|---|---|---|---|
| 1 | Students seeing fees | "Students cannot see fee information" (3.3, business rule 17) | "View only if Admin enables" — setting `fee_visible_to_students`, default **off** |
| 2 | Final student status | "Passed Out" | "Graduated" (`student_status = 'graduated'`) |
| 3 | Lifecycle steps | Active / Transferred / Withdrawn / Passed Out / Suspended | New Admission → Active → Class Promotion → Next Academic Year → Graduated / Transferred / Withdrawn (Suspended allowed) |
| 4 | Teacher record visibility | Teacher sees own record | Unchanged (teacher sees own record only) |

The fee switch is stored (`school_settings.fee_visible_to_students = false`) and enforced in the
student-facing fee endpoints from Step 7. Nothing in the schema assumes students can see fees.
**Confirmed by the owner:** the admin controls the switch and it stays off by default.

## Resolution R1b — visual reference

The Learnthru screenshot (BRD Annex A) was not supplied. The owner delegated the visual design
to the build, so the UI follows BRD §5.1 in writing plus the tokens in the build prompt:
Mulish, `#5F6DB0` primary, `#EE8791` coral, `#2D3156` text, `#F1F2F8` canvas, radii 12–28 px,
soft shadows, roomy spacing. If the screenshot appears later, the tokens are in
`frontend/src/styles/global.css` — one file to retune, not a redesign.

## Resolution R1c — no demo data in the development database

The owner wants the dev database clean for real data entry. `SEED_DEMO=false` in
`backend/.env`; the seed creates reference data (classes, sections, subjects, periods, grades,
fee categories, academic years, settings) and the first admin only. Test accounts and fixtures
live in a **separate** database, `vvs_test`, created by `backend/tests/support/fixtures.js`.

## Resolution R2 — parent accounts

One `users` row per family (`role = 'parent'`), one `parents` row linked to it, and a
`student_parents` join so siblings share the account. The child switcher is a UI concern over
that join. Guardians without an email can log in with their mobile number: the seed and the
admission service use `username = email` when present, otherwise the mobile number.

## Resolution R3 — attendance percentage

BRD 9.3: `(Present + Late + Half Day × 0.5) / total working days excluding holidays`.
Late is counted as full attendance; Half Day as 0.5. Implemented as a shared SQL expression in
Step 5 so every report uses one formula.

## Resolution R4 — configurable vocabularies are tables, closed vocabularies are enums

* Event categories are admin-extensible → `event_categories` table.
* Announcement types, attendance statuses, fee payment modes, exam types, grade scale rows are
  fixed by the spec → PostgreSQL enums / seeded rows. Adding a value is a migration, which is
  the point: it is a deliberate, reviewable change.

## Resolution R5 — one parent, one account, no self-service signup

Accounts are created by an Admin only. "Forgot password" is Admin-assisted in this release
(email/SMS delivery is out of scope), so there is no password-reset token table yet.

---

## ADR-001 — INTEGER identity primary keys

**Context.** Every table needs a primary key; node-postgres returns `BIGINT` as a *string*, which
silently breaks `row.id === Number(param)` comparisons and ID-based authorization checks.

**Decision.** `INTEGER GENERATED ALWAYS AS IDENTITY` for all surrogate keys. `audit_logs` uses
`BIGINT` (append-only, highest volume) and is never used as a lookup key from the client.

**Alternatives.** BIGSERIAL (string-returning in JS), UUID (larger indexes, no ordering).
**Consequence.** ~2.1 billion rows per table is far beyond a single school; IDs stay JS numbers, so
ID-tampering checks compare numbers to numbers.

## ADR-002 — soft delete + partial unique indexes

`deleted_at TIMESTAMPTZ` on business tables; lists filter `deleted_at IS NULL`. Unique indexes are
partial (`WHERE deleted_at IS NULL`) so a deleted class/subject name can be re-created, while
business numbers (`admission_id`, `employee_id`, `receipt_no`) stay globally unique forever — those
must never be reused.

## ADR-003 — money and dates

Money is `NUMERIC(12,2)` and stays a string in Node (never a float). `DATE` columns are returned as
raw `'YYYY-MM-DD'` strings (type parser in `src/config/db.js`) because `new Date('2026-11-17')`
followed by `toISOString()` moves the day backwards in IST. Timestamps are `TIMESTAMPTZ`;
display timezone is Asia/Kolkata, DD-MM-YYYY.

## ADR-004 — permissions in code, roles in the database

The four roles are rows (`roles`), but the permission matrix is a single exported constant in
`backend/src/config/permissions.js` (Step 2) rather than a `role_permissions` table. The matrix is
fixed for the release, is reviewed as code, and cannot drift from the routes that check it.
Settings shows it read-only. Trade-off: changing the matrix needs a deploy, not an admin screen —
acceptable for Release 1, revisit if the school asks for per-user overrides.

## ADR-005 — single API envelope

Every response is `{ success: true, data }` or `{ success: false, error: { code, message, fields? } }`.
The frontend has exactly one place to interpret failures, and no stack traces ever reach a client.

## ADR-006 — migrations are additive and checksum-locked

`scripts/migrate.js` refuses to run if an applied file's sha256 changed. Schema changes are new
files. Each file runs in its own transaction under an advisory lock, so two deploys cannot race.

## ADR-007 — session strategy (Step 2)

* **Access token**: JWT, 15 minutes, held **in memory** on the client and sent in the
  `Authorization: Bearer` header. Nothing in `localStorage`, so an XSS cannot lift a token from
  storage, and because authorization never rides on a cookie, state-changing requests are not
  CSRF-able — that is why there is no CSRF token in this release.
* **Refresh token**: 48 random bytes, only its sha256 stored, delivered as an `httpOnly`
  `SameSite=Lax` cookie scoped to `/api/auth`. Rotated on every refresh.
* **Reuse detection**: presenting a consumed refresh token revokes the entire token family and
  returns `SESSION_REVOKED`. A stolen cookie is therefore worth one request, not thirty days.
* **Remember me** only changes refresh lifetime (7 → 30 days) and whether the cookie is
  persistent. The access token lifetime never changes.
* **Password change** revokes every other device's refresh tokens but keeps the current one.
* The user is re-read from the database on every request, so deactivating an account or changing
  a role takes effect immediately rather than when the JWT expires.

## ADR-008 — one dashboard endpoint per role, not one generic endpoint

**Decision.** `GET /api/dashboard/{admin|teacher|student|parent}` returns a shape built for that
role. The route is guarded by `requireRole`-equivalent checks (`requirePermission` on a permission
only that role holds) **and** re-checks `req.user.role === role` in the controller.

**Why.** A generic `/dashboard` that adapts by role means every field must be tested against every
role forever; one wrong `if` leaks a figure. Separate payloads make the contract explicit and let
each builder's SQL carry its own `WHERE` scope (teacher: `teacher_subjects`; student: own
`students.user_id`; parent: `student_parents`).

**Alternatives.** A single endpoint with per-field permission tags — more flexible, much easier to
leak by omission. **Trade-off:** four payload builders to keep in sync; each one is ~60 lines and
its numbers are asserted in `tests/dashboard.test.js`.

The parent payload takes `childId`, and the id is resolved against the account's own children
before any query runs — an id outside that set is `403 CHILD_FORBIDDEN`, not a filtered-empty
result. That is the IDOR guard the acceptance criteria call out.

## ADR-009 — one request fills the whole screen

The dashboard payload includes the `shell` block (user identity, month calendar, reminders,
notices, unread count). The layout renders the sidebar, top bar and right panel from that same
response, so the three zones cannot disagree and a screen costs one round-trip (the BRD asks for
dashboards under 3 s). "Today", the month grid and all date labels are computed **in the
database** with `AT TIME ZONE 'Asia/Kolkata'`; the client never derives a date from a timestamp.

## ADR-010 — lockout semantics

Five consecutive failed passwords lock the account for 15 minutes (`users.failed_login_attempts`,
`users.locked_until`). A successful login resets the counter. Once the window passes the counter
restarts at 1 rather than staying at 5, so an old lock cannot re-trigger on the next typo.
The response is `423 ACCOUNT_LOCKED` with the remaining minutes. Independently,
`express-rate-limit` caps sign-in attempts per IP (20 / 15 min, successful attempts excluded) so
one host cannot spray many accounts. Only failures and lockouts are audited, never passwords.
