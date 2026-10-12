# Novel-Map

Novel-Map is a static holographic map demo for Macau. Visitors can view approved community landmarks and location videos on `Holo-Map.html`, upload new videos from `Map-upload.html`, and admins can review pending submissions from `Admin.html`.

## Pages

- `Holo-Map.html` - Main map view with school, museum, and approved user-submitted markers.
- `Map-upload.html` - Video upload form with GPS detection and manual map location selection.
- `Upload-status.html` - Check an upload's current status using its upload ID.
- `Admin.html` - Admin review page for approving or rejecting pending videos and landmarks.

## Upload Status Setup

Run `supabase-upload-status.sql` in the Supabase SQL Editor after the existing manual approval setup. It adds the status lookup function without making pending or rejected video records publicly readable.

## User-Created Map Landmarks

Run `supabase-map-landmarks.sql` in the Supabase SQL Editor after `supabase-manual-approval.sql`. Visitors can submit a landmark by choosing a map location and filling in its card details. Submitted landmarks remain hidden until an admin approves them in `Admin.html`.

## Review Workflow

1. Users upload videos from `Map-upload.html` or submit landmarks from `Holo-Map.html`.
2. New cloud videos and landmarks are saved with `pending` status. Video uploads display a unique upload ID and a link to check their status.
3. Admin signs in at `Admin.html`.
4. Click approve to publish a video or landmark to the map, or reject to keep it hidden.
5. `Holo-Map.html` only displays approved videos and landmarks.

## Checking an Upload

Keep the upload ID or bookmark the link on the success receipt. Open `Upload-status.html` from the map or upload page and enter the ID to see `pending`, `approved`, or `rejected`, along with the submission time. Check again to get the latest decision. No account is needed, and cloud uploads can be checked from another device.

The status link carries the ID in its URL fragment (`#id=...`). Anyone with the ID can see the status and submission time, but the lookup does not return the video URL, title, description, or coordinates. The ID stays the same when an admin approves or rejects the upload.

The browser remembers the most recently checked upload ID when local storage is available. Keep a separate copy for other devices or if browser data is cleared. Local previews stored in IndexedDB are labeled separately: they are not submitted for review and can only be checked in the same browser.

The status page calls the public Supabase status endpoint directly, so it works without the external Supabase JavaScript library or an admin session. Cloud results are checked before local previews. Connection attempts time out after 15 seconds and can be retried.

When publishing to GitHub Pages, deploy both `Upload-status.html` and `config.js` together. The status page versions its configuration script URL to avoid an older cached lookup implementation. If a status check works locally but is not found online, confirm the upload was saved to Supabase rather than only as a local preview.
