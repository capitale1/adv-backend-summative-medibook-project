# MediBook – Clinic Appointment Booking API

Backend for a community clinic's appointment system, built with **Node.js, Express 5, MySQL 8 (raw parameterized SQL via `mysql2`, no ORM), Redis and BullMQ**.

Doctors see patients in fixed 30-minute slots between 09:00 and 17:00, with at most 12 appointments per day. The API handles patients, doctors, booking, cancellation with refunds, a Redis-backed waitlist processed by a separate worker, reports, an audit log, and a localized course-feedback page.

---

## Contents

1. [Project structure](#project-structure)
2. [Setup](#setup)
3. [Running the app](#running-the-app)
4. [API reference](#api-reference)
5. [Design justifications (Parts C, D, E)](#design-justifications)
6. [Testing](#testing)

---

## Project structure

```
├── database/
│   ├── schema.sql            creates the medibook database and its 3 tables
│   └── seed.sql              sample data (incl. a zero-appointment doctor and a near-cap day)
├── schema-diagram.png        normalized (3NF) schema diagram
├── schema-diagram.dbml       source for the diagram (dbdiagram.io)
├── locales/                  en.json, fr.json – feedback page translations
├── scripts/
│   └── concurrency-demo.js   fires simultaneous bookings to prove the concurrency rules
├── tests/                    Jest unit tests (no MySQL/Redis needed)
└── src/
    ├── server.js             starts the HTTP API
    ├── worker.js             separate process: waitlist promotion + confirmation jobs
    ├── app.js                Express app, routes, error middleware
    ├── config/               env config, MySQL pool, Redis client, business rules
    ├── routes/               URL + HTTP method → controller
    ├── controllers/          request parsing, validation, status codes
    ├── services/             business logic (booking, cancellation, refunds, waitlist)
    ├── models/               ALL SQL and Redis data access lives here
    ├── queues/               BullMQ queue and job definitions
    ├── validators/           pure validation functions
    ├── i18n/, views/         locale loading and the feedback page template
    ├── middleware/           404 handler + central error handler
    └── utils/                errors, date helpers, audit logger
```

All business values (30-minute slots, working hours, 12-per-day cap, 80% busy threshold, refund tiers) are defined once in `src/config/businessRules.js`.

---

## Setup

### Prerequisites

- Node.js 18 or later
- MySQL 8 or later
- Redis 6.2 or later (Docker is the easiest option, especially on Windows)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and set your MySQL password:

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

`.env.example`:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=medibook

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

AUDIT_LOG_FILE=logs/audit.log
```

`.env` is git-ignored and must never be committed.

### 3. Create and seed the database

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

On **Windows PowerShell** (which does not support `<`), use:

```powershell
cmd /c "mysql -u root -p < database\schema.sql"
cmd /c "mysql -u root -p < database\seed.sql"
```

If `mysql` is not recognized, add MySQL's `bin` folder to your PATH, e.g. `C:\Program Files\MySQL\MySQL Server 9.4\bin`.

Running `schema.sql` again drops and recreates the database, which is a quick way to reset to the seed data. Stop the API first.

### 4. Start Redis

```bash
docker run -d --name medibook-redis -p 6379:6379 redis:7
```

After the first time, use `docker start medibook-redis`.

---

## Running the app

The API and the worker are **two separate processes**. Run each in its own terminal:

```bash
npm start          # API on http://localhost:3000
npm run worker     # background worker (waitlist promotion + confirmations)
npm test           # unit tests
```

The API keeps working if the worker is stopped or Redis is down. Jobs simply wait in Redis, or are skipped with a logged error if Redis is unreachable.

---

## API reference

All request and response bodies are JSON. Date-times use clinic-local time in the format `YYYY-MM-DD HH:MM`.

### Patients and doctors

| Method | Path | Description |
|---|---|---|
| GET | `/api/patients` | List patients |
| GET | `/api/patients/:id` | Get one patient |
| POST | `/api/patients` | Create a patient: `{ "full_name", "email", "phone" }` |
| PUT | `/api/patients/:id` | Replace a patient (same body as POST) |
| DELETE | `/api/patients/:id` | Delete a patient (409 if they have appointments) |
| GET | `/api/doctors` | List doctors |
| GET | `/api/doctors/:id` | Get one doctor |
| POST | `/api/doctors` | Create a doctor: `{ "full_name", "specialty", "consultation_fee", "room" }` |
| PUT | `/api/doctors/:id` | Replace a doctor |
| DELETE | `/api/doctors/:id` | Delete a doctor (409 if they have appointments) |

### Appointments

| Method | Path | Description |
|---|---|---|
| POST | `/api/appointments` | Book: `{ "patient_id": 2, "doctor_id": 1, "slot_start": "2026-11-27 16:30" }` |
| GET | `/api/appointments/:id` | Get one appointment |
| DELETE | `/api/appointments/:id` | Cancel. The record is kept; the response contains the refund. |

Example cancellation response:

```json
{
  "message": "Appointment cancelled. Refund: 75.00 (50%)",
  "appointment": { "id": 9, "status": "CANCELLED", "refund_amount": 75, "...": "..." },
  "refund": { "notice_hours": 30.5, "percent": 50, "amount": 75 }
}
```

### Waitlist

| Method | Path | Description |
|---|---|---|
| POST | `/api/waitlist` | Join the waitlist (same body as booking). Only allowed when the slot or the day is full. |
| GET | `/api/waitlist?doctor_id=1&slot_start=2026-11-27%2010:00` | View the slot waitlist and the day waitlist |

### Statistics and reports

| Method | Path | Description |
|---|---|---|
| GET | `/api/doctors/:id/statistics` | Revenue collected, upcoming count, appointments per day for the next 7 days, utilization % against the 12-slot cap |
| GET | `/api/reports/doctors` | Every doctor's total, booked and cancelled appointments and revenue, including doctors with zero appointments |
| GET | `/api/reports/busy-days` | Every (doctor, date) with more than 80% of the 12 daily slots booked |

**Revenue collected** is `amount_paid − refund_amount`, summed over all appointments. A cancelled booking with a 50% refund keeps the other 50%.

### Feedback page

| Method | Path | Description |
|---|---|---|
| GET | `/feedback` | Course feedback form in English |
| GET | `/feedback?lang=fr` | French version. Unsupported values fall back to English. |

### Status codes

| Code | When |
|---|---|
| 200 / 201 / 204 | Success (201 with a `Location` header on create, 204 on delete) |
| 400 | Malformed input: missing fields, wrong types, invalid dates, bad JSON |
| 404 | Unknown id or route |
| 409 | Conflict: slot taken, day full, already cancelled, already on the waitlist, duplicate email, deleting a record with appointments |
| 422 | Well-formed request that breaks a business rule: past slot, outside working hours, not on a 30-minute boundary, cancelling an appointment that has started, joining the waitlist for a free slot |
| 503 | Waitlist unavailable because Redis is down |

All errors go through one central error-handling middleware and share the shape `{ "error": "...", "details": ... }`.

---

## Design justifications

### Database design (Part A)

The original spreadsheet repeated each patient's and doctor's details on every appointment row. In 3NF, patient attributes depend only on the patient and doctor attributes only on the doctor, so they move to `patients` and `doctors`. `appointments` keeps only foreign keys plus facts about that single booking.

`amount_paid` deliberately stays on `appointments` and is not derived from the doctor's fee. AP-002 paid 120.00 against a fee of 150.00, so it is a fact about the booking, and storing it does not violate 3NF.

Only 3 tables are allowed, so a cancellation's refund record lives on the appointment row itself (`status`, `cancelled_at`, `refund_amount`). A CHECK constraint ensures a booked row never has refund data and a cancelled row always does.

### Part C – Booking rules and concurrency

**Future-only, working hours and the 30-minute boundary** are checked in `validators/slotValidator.js` (422 on failure). The 30-minute boundary and working hours are also CHECK constraints in the schema. Future-only cannot be a CHECK constraint, because MySQL does not allow `NOW()` in one.

**No two patients in the same slot, even at the same instant.** This is guaranteed by the database rather than by application code. The generated column `active_slot` equals `slot_start` while an appointment is BOOKED and becomes NULL when it is cancelled, and `UNIQUE (doctor_id, active_slot)` makes a double booking impossible. MySQL allows many NULLs in a unique index, so a cancelled slot is immediately bookable again while the cancelled row stays for refund history. When two requests race, MySQL rejects the second insert with a duplicate-key error, which the service turns into a 409.

**The 12-per-day cap under concurrency.** A unique index cannot express "at most 12 per day", and a naive count-then-insert would let two simultaneous requests both see 11 and both insert. Booking therefore runs in a transaction that first locks the doctor's row with `SELECT ... FOR UPDATE`. Concurrent bookings for the same doctor queue on that lock, so the count and the insert happen atomically. Bookings for *different* doctors are not blocked.

`scripts/concurrency-demo.js` demonstrates both guarantees. Five simultaneous requests for one slot produce exactly one 201. Simultaneous requests for the last free slot of a day leave exactly 12 bookings.

**Refund policy** (computed by the server in `services/refundCalculator.js`; the client never sends an amount):

| Notice before the appointment | Refund |
|---|---|
| more than 48 hours | 100% |
| 24 to 48 hours, **both boundaries included** | 50% |
| less than 24 hours | 0% |

Exactly 48h and exactly 24h both give 50%, matching the wording "24–48 hours → 50%". Amounts are calculated in whole cents to avoid floating-point errors. Appointments that have already started cannot be cancelled (422).

**Cancellation and refund succeed or fail together.** Both are written by a single `UPDATE` inside a transaction that first locks the appointment row (`FOR UPDATE`). Two simultaneous cancellations therefore cannot both refund, and the second gets 409.

**Cancelling is `DELETE /api/appointments/:id`.** It is a soft delete: from the client's view the booking is removed, but the row is kept for refund history.

### Part D – Audit log

`utils/auditLogger.js` appends one JSON line per event to `logs/audit.log` using `fs/promises` (`mkdir` and `appendFile`), never `*Sync` calls, so request handling is never blocked.

- The `logs/` directory is created with `mkdir({ recursive: true })` at server and worker startup and again before writes if needed. The directory creation is cached, and retried if it fails.
- Entries are written only **after** the transaction commits, so the log records only successful bookings and cancellations.
- `writeAuditEntry` catches every error itself and never throws. Services call it without awaiting, so a full disk or a permissions problem is reported on the console but never fails or slows the user's request.
- Logged events: `APPOINTMENT_BOOKED`, `APPOINTMENT_CANCELLED`, `CONFIRMATION_SENT`, `WAITLIST_JOINED`, `WAITLIST_PROMOTED`, `WAITLIST_PROMOTION_FAILED`, `WAITLIST_ENTRY_DROPPED`.

### Part E – Waitlist, worker and notifications

**Offering a waitlist spot.** When a booking fails because the slot is taken or the day is full, the 409 response includes a ready-made `POST /api/waitlist` request. Joining places the patient on one of two Redis lists:

- `waitlist:doctor:{id}:slot:{datetime}` when that specific slot is taken;
- `waitlist:doctor:{id}:day:{date}` when the doctor's whole day is full.

Joining a waitlist for a free slot is rejected (422), and joining the same list twice gives 409. The waitlist lives in Redis because the schema may only have 3 tables.

**Promotion by a separate worker.** Cancelling enqueues a `promote-waitlist` job on a BullMQ queue. `src/worker.js` runs as its own process (`npm run worker`). It checks the slot's waitlist first, then the day's waitlist, and books the first patient into the freed slot using the same transactional `bookAppointment` as the API, so every rule (cap, unique slot) still applies.

**What if the promoted booking fails? The patient must never vanish.** The worker uses Redis's reliable-queue pattern:

1. `LMOVE` atomically moves the first entry from the waitlist into `waitlist:processing`. At every moment the patient is in exactly one list.
2. If the booking **succeeds**, the entry is removed from `processing`.
3. If it fails with a **conflict** (for example, the slot was taken again before the worker ran), a `MULTI` transaction atomically moves the entry back to the **front** of its waitlist, so the patient keeps their place. The failure is logged.
4. If the patient or doctor **no longer exists** (404), the entry is dropped, the drop is logged, and the next patient is tried.
5. If an **unexpected error** happens (for example, the database is down), the entry is put back and the job is rethrown, so BullMQ retries it up to 3 times with exponential backoff.
6. If the **worker crashes** mid-promotion, the entry is left in `processing`. On startup the worker returns every entry in `processing` to the front of its original list.

Known trade-off: if the worker crashes in the tiny window after the booking commits but before the entry is removed from `processing`, recovery would put a patient who is already booked back on the waitlist. This is at-least-once delivery. Recovery also assumes a single worker instance.

**Confirmation notifications.** Every successful booking, from the API or from a waitlist promotion, enqueues a `send-confirmation` job, with `jobId = confirmation-{appointmentId}` so duplicates are ignored. The worker loads the appointment with a join across patients and doctors, builds the SMS/email text, and writes it to the audit log as `CONFIRMATION_SENT`. Nothing is actually sent.

**Redis outages.** The API's queue connection fails fast instead of hanging. If Redis is down, bookings and cancellations still succeed (the job is skipped with a logged error) and the waitlist endpoints return 503.

### Statistics and reports (Parts C.4–C.6)

All figures are produced by SQL in `models/reportModel.js` using joins and aggregates, not computed in JavaScript.

- **Next 7 days:** a recursive CTE generates the 7 dates and `LEFT JOIN`s appointments, so days with zero bookings still appear.
- **Utilization:** booked slots divided by capacity (12 per day, or 7 × 12 = 84 for the week), calculated in SQL.
- **Doctors report:** `LEFT JOIN` with `COALESCE`, so doctors with no appointments appear with 0.
- **Busy days:** `GROUP BY` doctor and date with `HAVING COUNT(*) > 12 * 0.8`. MySQL compares against exactly 9.6, so a day is busy from 10 booked slots upward.

---

## Testing

```bash
npm test
```

31 Jest tests run on pure functions only, so **no MySQL or Redis connection is needed**:

- **Refund calculator:** all three tiers, exactly 48h, exactly 24h, one minute either side of each boundary, and partial payments in exact cents. All tests use fixed dates.
- **Slot validator:** valid slots, the first (09:00) and last (16:30) slots, 17:00, 08:30, 09:15, a past slot, a slot starting exactly now, and several rules broken at once.
- **Date parsing:** malformed and impossible dates (`2026-02-30`, `25:00`, `tomorrow`, wrong types) are rejected.
- **Localization:** French loads for `lang=fr`; unsupported, empty or repeated `lang` values fall back to English; both locales have exactly 5 questions; dates are formatted per locale.

Video demo
https://youtu.be/N3nPB_apY-A
