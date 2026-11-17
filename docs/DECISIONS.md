# Decisions

Two kinds of entries: **ADRs** (technical choices) and **resolutions** (places where the build
prompt and the supplied BRD disagree). Anything marked *default* was chosen because the source
documents do not settle it; change it and this file changes with it.

---

## Resolution R1 — prompt v1.2 wins over BRD v1.1

The build prompt refers to "BRD v1.2", but the document supplied with it is
`Business Requirements Document (BRD).docx` **version 1.1 (Revised Draft)**. Where the two
disagree, the build prompt is treated as the newer instruction. Deltas found so far:

| # | Topic | BRD v1.1 | Build prompt (used) |
|---|---|---|---|
| 1 | Students seeing fees | "Students cannot see fee information" (3.3, business rule 17) | "View only if Admin enables" — setting `fee_visible_to_students`, default **off** |
| 2 | Final student status | "Passed Out" | "Graduated" (`student_status = 'graduated'`) |
| 3 | Lifecycle steps | Active / Transferred / Withdrawn / Passed Out / Suspended | New Admission → Active → Class Promotion → Next Academic Year → Graduated / Transferred / Withdrawn (Suspended allowed) |
| 4 | Teacher record visibility | Teacher sees own record | Unchanged (teacher sees own record only) |

The fee switch is stored (`school_settings.fee_visible_to_students = false`) and enforced in the
student-facing fee endpoints from Step 7. Nothing in the schema assumes students can see fees.

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
