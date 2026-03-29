# Stackfusion Assignment — Parking Management System

This is my submission for the Stackfusion Full-Stack Developer Assignment. The task wasn't to build something from scratch — it was to walk into a codebase that was *intentionally broken* in realistic ways and fix it. Honestly, that's a much better test of real-world engineering instincts than a greenfield project.

The system is a parking management platform built across three services: a **Django REST API**, a **Go** microservice, and a **Next.js** frontend. Each one had its own set of bugs waiting to be found.

---

## My Approach

I treated this the same way I'd approach a debugging session at work — layer by layer, no jumping to conclusions.

1. **Start with infrastructure.** Got PostgreSQL running via the provided `.docker/` configuration first. There's no point chasing application bugs if the database isn't even up.
2. **Hit the APIs directly.** Ran both the Django server (port 8000) and the Go server (port 8080) locally and started triggering endpoints. Anything returning a 500, a 400, or just suspiciously wrong data went straight onto my list.
3. **Cross-reference the frontend.** Looked at how `frontend-nextjs` was constructing its API calls and matched that against what the backends actually expected. A lot of integration bugs live exactly in that gap.
4. **Validate end-to-end.** The real test was whether I could complete a full booking and reporting lifecycle through the Next.js UI without anything breaking. That became my definition of "done."

---

## Fixes Implemented

11 bugs fixed across the three services. Here's a breakdown of each one.

---

### Django API (`backend-django`)

**Available slots were returning occupied ones.**
The `get_available_slots` function was filtering for `is_occupied=True`. A one-character fix — flipped it to `False` — and suddenly the available slots endpoint was actually returning available slots.

**Double booking was possible.**
After a booking was created, the slot's `is_occupied` flag was never being updated. So the same slot could be booked twice in a row. Added `slot.is_occupied = True` followed by `.save()` immediately after a successful booking instantiation.

**POST requests were broken due to a serializer mismatch.**
The `BookingSerializer` was using `depth=1`, which is great for reading nested data — but it silently converts foreign keys into read-only nested objects, which kills any `POST` request trying to write those fields. I split this into two serializers: `BookingReadSerializer` for GET responses and `BookingWriteSerializer` for POST payloads. Clean separation, no more write failures.

**The POST payload was being rejected with a 400.**
Even after fixing the serializer split, POST requests were still failing because the write serializer was expecting a `start_time` field that the Next.js frontend never sends (correctly so — timestamps should be generated server-side). Restricted `BookingWriteSerializer` to only `["vehicle", "slot"]` and the 400s disappeared.

**CORS was blocking all frontend requests.**
The browser was rejecting every request from `localhost:3000` to the Django server. Installed `django-cors-headers` and wired it into the middleware stack to handle cross-origin requests properly.

---

### Go API (`backend-go`)

**The `/active-bookings` endpoint was crashing at runtime.**
The SQL JOIN was referencing `parking_slot.slot_id` — a column that doesn't exist. The actual primary key, as defined in the Django schema, is just `id`. Updated the JOIN to use `s.id` and the runtime error went away.

**Active bookings were returning completed ones instead.**
The SQL filter was `WHERE b.end_time IS NOT NULL` — which is exactly backwards. That's the condition for *completed* bookings. Changed it to `IS NULL` to correctly surface sessions that are still active.

**CORS was blocking frontend requests here too.**
Same cross-origin issue as Django. Added an `enableCORS()` middleware to the Go server to handle OPTIONS preflight requests and cross-origin headers natively.

---

### Next.js Frontend (`frontend-nextjs`)

**The Django API URL was pointing to the wrong port.**
`API_DJANGO_BASE` in `api.js` was set to `:8001`. Django runs on `:8000`. Changed it, and every Django-dependent page started working.

**Available slots weren't loading because the lot ID wasn't being sent.**
`loadSlots()` was calling `fetchAvailableSlots()` without actually passing `selectedLot` into it. The API was receiving no lot ID, returning nothing useful, and the slot grid stayed empty. Added the argument and the grid populated correctly.

**The slot grid wasn't refreshing after a booking.**
After completing a booking, the UI still showed the freshly-occupied slot as available. Added a `fetchSlots()` call right after a successful booking in `SlotGrid.js` so the grid immediately reflects the updated state.

---

## Assumptions Made

A few decisions I made that are worth being transparent about:

**The Django models are the source of truth for the schema.** Rather than touching migrations, I updated the Go raw SQL to match what Django had defined. The slot primary key is `id`, not `slot_id` — Go was wrong, not Django.

**`start_time` belongs on the server, not the client.** I assumed the booking timestamp should always be set server-side using `timezone.now()`. Anything passed from the frontend for this field is redundant and safely ignored.

**No over-engineering.** The assignment was clear: fix the broken paths, don't rebuild the system. So I avoided pulling in state management libraries for Next.js or abstracting Django views into something more complex than needed. Every fix is localized and minimal.

**Vehicle IDs are pre-seeded and bounded.** The `sample_data.json` fixture loads 4 vehicles (IDs 1–4). Entering an ID outside that range will result in a 400 from Django — that's expected foreign key validation behavior, not a bug. Building a full vehicle CRUD interface felt out of scope for this task.