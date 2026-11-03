# Esquina Park Rangers club app

This is a new, mobile-first installable web app in `app/`. The existing tournament pages at the repository root are untouched.

## What is included

- Home screen for fans and players
- Fixtures and results for both days of the International Walking Football Cup
- Live fixture feed refreshed every 30 seconds, with a saved-data fallback
- Events and useful club information
- Links to the existing league table and a map of Rojales
- Progressive Web App manifest, install prompt and offline app-shell caching

## Run and publish

The app is static and can be served from the repository's existing hosting. Open `app/index.html` over HTTPS in a browser; service workers and installability do not work from a plain `file://` URL. For local testing, serve the repository root with a local static HTTP server and visit `/app/`.

When GitHub Pages is enabled for this repository, the app path will be `/Results/app/` (or the matching custom-domain path). The existing pages remain at their current root URLs.

## Club details to add later

The repository currently provides tournament fixture/result feeds and the club badge, but no general events calendar, training schedule, contact details, or player roster. Those sections are clearly marked for club information to be added; no private player area or made-up contact information is included.
