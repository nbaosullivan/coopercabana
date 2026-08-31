# Boarding passes

Drop each attendee's boarding pass here, named by their attendee id (UUID).
These files are NOT public — they are served only to the signed-in owner
(or an admin) through the /boarding route.

- `<uuid>.png` — a single combined pass
- `<uuid>-outbound.png` / `<uuid>-return.png` — one image per leg

Supported extensions (tried in order): `.png`, `.jpg`, `.jpeg`, `.webp`.
Only the signed-in person sees their own pass, on the Flights tab.

NOTE: if this repo is ever made public, remove these files first — boarding
passes contain PNRs/barcodes.
