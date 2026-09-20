# Novel-Map

Novel-Map is a static holographic map demo for Macau. Visitors can view approved location videos on `Holo-Map.html`, upload new videos from `Map-upload.html`, and admins can review pending uploads from `Admin.html`.

## Pages

- `Holo-Map.html` - Main map view with school, museum, and approved user video markers.
- `Map-upload.html` - Video upload form with GPS detection and manual map location selection.
- `Admin.html` - Admin review page for approving or rejecting pending videos.

```

## Review Workflow

1. Users upload videos from `Map-upload.html`.
2. New videos are saved with `pending` status.
3. Admin signs in at `Admin.html`.
4. Click the approve button in `Admin.html` to publish a video to the map, or the reject button to keep it hidden.
5. `Holo-Map.html` only displays videos with `approved` status.