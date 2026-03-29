# Stackfusion Assignment - Parking Management System

This is my submission for the Stackfusion Full-Stack Developer Assignment. The task was not to create something from scratch, but to work with a codebase that was intentionally broken in realistic ways and fix it. Honestly, that's a better test of real-world engineering instincts than starting fresh. 

The system is a parking management platform built across three services: a **Django REST API**, a **Go** microservice, and a **Next.js** frontend. Each one had its own set of bugs to discover.

## My Approach

I tackled this like I would during a debugging session at work, layer by layer, and without jumping to conclusions.

1. **Start with infrastructure.** I got PostgreSQL running using the provided `.docker/` configuration first. There's no sense in chasing application bugs if the database isn't operational. 
2. **Hit the APIs directly.** I ran both the Django server (port 8000) and the Go server (port 8080) locally and started triggering endpoints. Anything returning a 500, a 400, or just suspiciously incorrect data went straight onto my list. 
3. **Cross-reference the frontend.** I examined how `frontend-nextjs` was making its API calls and matched that against the expectations of the backends. A lot of integration bugs exist in that gap. 
4. **Validate end-to-end.** The real test was whether I could complete a full booking and reporting lifecycle through the Next.js UI without anything breaking. That became my definition of "done."

## Fixes Implemented

I fixed 11 bugs across the three services. Here’s a breakdown of each one.

### Django API (`backend-django`)

**Available slots were returning occupied ones.**  
The `get_available_slots` function was filtering for `is_occupied=True`. A one-character fix flipped it to `False`, and suddenly the available slots endpoint was correctly returning available slots. 

**Double booking was possible.**  
After creating a booking, the slot's `is_occupied` flag was never updated. This allowed the same slot to be booked twice in a row. I added `slot.is_occupied = True` followed by `.save()` immediately after a successful booking. 

**POST requests were broken due to a serializer mismatch.**  
The `BookingSerializer` was using `depth=1`, which is fine for reading nested data, but it silently converts foreign keys into read-only nested objects, preventing any `POST` request from writing those fields. I split this into two serializers: `BookingReadSerializer` for GET responses and `BookingWriteSerializer` for POST payloads. Clean separation meant no more write failures. 

**The POST payload was being rejected with a 400.**  
Even after fixing the serializer split, POST requests still failed because the write serializer expected a `start_time` field that the Next.js frontend never sent (which was correct since timestamps should be generated server-side). I limited `BookingWriteSerializer` to only `["vehicle", "slot"]`, and the 400s disappeared. 

**CORS was blocking all frontend requests.**  
The browser rejected every request from `localhost:3000` to the Django server. I installed `django-cors-headers` and integrated it into the middleware stack to handle cross-origin requests properly. 

### Go API (`backend-go`)

**The `/active-bookings` endpoint was crashing at runtime.**  
The SQL JOIN referenced `parking_slot.slot_id`, a column that doesn't exist. The actual primary key, as defined in the Django schema, is just `id`. I updated the JOIN to use `s.id`, and the runtime error disappeared.

**Active bookings were returning completed ones instead.**  
The SQL filter was `WHERE b.end_time IS NOT NULL`, which was backwards. That condition was for completed bookings. I changed it to `IS NULL` to correctly show sessions that are still active.

**CORS was blocking frontend requests here too.**  
I faced the same cross-origin issue as with Django. I added an `enableCORS()` middleware to the Go server to handle OPTIONS preflight requests and add cross-origin headers.

### Next.js Frontend (`frontend-nextjs`)

**The Django API URL was pointing to the wrong port.**  
`API_DJANGO_BASE` in `api.js` was set to `:8001`. Django runs on `:8000`. I changed it, and every Django-dependent page started working.

**Available slots weren't loading because the lot ID wasn't being sent.**  
`loadSlots()` was calling `fetchAvailableSlots()` without passing `selectedLot` into it. The API received no lot ID, returned nothing useful, and the slot grid remained empty. I added the argument, and the grid populated correctly.

**The slot grid wasn't refreshing after a booking.**  
After completing a booking, the UI still showed the freshly occupied slot as available. I added a `fetchSlots()` call right after a successful booking in `SlotGrid.js` so the grid immediately reflects the updated state.

## Assumptions Made

Here are a few decisions I made that are worth noting:

**The Django models are the source of truth for the schema.** Instead of adjusting migrations, I updated the Go raw SQL to match what Django defined. The slot primary key is `id`, not `slot_id`; Go was incorrect, not Django.

**`start_time` belongs on the server, not the client.** I assumed the booking timestamp should always be set server-side using `timezone.now()`. Anything passed from the frontend for this field is redundant and safely ignored.

**No over-engineering.** The assignment was clear: fix the broken paths, don’t rebuild the system. I avoided bringing in state management libraries for Next.js or complicating Django views more than necessary. Every fix was localized and minimal.

**Vehicle IDs are pre-seeded and bounded.** The `sample_data.json` fixture loads 4 vehicles (IDs 1–4). Entering an ID outside that range will lead to a 400 from Django. That's expected foreign key validation behavior, not a bug. Creating a full vehicle CRUD interface felt beyond the scope of this task.