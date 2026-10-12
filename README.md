# Novel-Map

Novel-Map is a static holographic map demo for Macau. Visitors can view approved location videos on `Holo-Map.html`, upload new videos from `Map-upload.html`, and admins can review pending uploads from `Admin.html`.

## Pages

- `Holo-Map.html` - Main map view with school, museum, and approved user video markers.
- `Map-upload.html` - Video upload form with GPS detection and manual map location selection.
- `Upload-status.html` - Check an upload's current status using its upload ID.
- `Admin.html` - Admin review page for approving or rejecting pending videos.

## Upload Status Setup

Run `supabase-upload-status.sql` in the Supabase SQL Editor after the existing manual approval setup. It adds the status lookup function without making pending or rejected video records publicly readable.

## Review Workflow

1. Users upload videos from `Map-upload.html`.
2. New cloud videos are saved with `pending` status. The success receipt displays a unique upload ID and a link to check its status.
3. Admin signs in at `Admin.html`.
4. Click the approve button in `Admin.html` to publish a video to the map, or the reject button to keep it hidden.
5. `Holo-Map.html` only displays videos with `approved` status.

## Checking an Upload

Keep the upload ID or bookmark the link on the success receipt. Open `Upload-status.html` from the map or upload page and enter the ID to see `pending`, `approved`, or `rejected`, along with the submission time. Check again to get the latest decision. No account is needed, and cloud uploads can be checked from another device.

The status link carries the ID in its URL fragment (`#id=...`). Anyone with the ID can see the status and submission time, but the lookup does not return the video URL, title, description, or coordinates. The ID stays the same when an admin approves or rejects the upload.

The browser remembers the most recently checked upload ID when local storage is available. Keep a separate copy for other devices or if browser data is cleared. Local previews stored in IndexedDB are labeled separately: they are not submitted for review and can only be checked in the same browser.
