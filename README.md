# Safe Spaces

An installable, offline-capable web app that helps people in South Africa find nearby support and safety resources quickly.

**Live:** https://safe-spaces-361fa.web.app

Safe Spaces started as a 48-hour build at the FNB App of the Year hackathon. I have kept developing it since, focusing on speed of access, accessibility and security.

## What it does

- **Level-of-need flow.** A short tiered flow points people to the right kind of help first.
- **Nearby resources.** Live geolocation, open-now filtering and directions, using the Google Maps Places API.
- **Panic alerts** with location capture.
- **Works offline and installs like an app.** Built as a PWA with Workbox.

## Design decisions

**No mandatory sign-in.** Someone looking for help should not hit a login screen. The app uses anonymous Firebase Auth so it works in one tap.

**Accessibility.** The production site scores 100/100 on Lighthouse's accessibility audit. Work included:

- colour contrast corrected across light and dark themes
- a repaired semantic heading hierarchy for screen-reader navigation
- visible keyboard focus states and accessible interactive controls
- respect for reduced-motion preferences
- responsive, touch-friendly layouts for mobile

This is Lighthouse-tested and WCAG-aligned. It has not had a formal WCAG audit with assistive-technology testing.

**Security.**

- least-privilege Firestore security rules
- strict Content Security Policy, HSTS, `X-Frame-Options: DENY` and a Permissions-Policy
- critical and high dependency vulnerabilities remediated, including a protobufjs remote code execution issue and React Router XSS and open-redirect issues

## Tech stack

React · TypeScript · Vite · Firebase (Auth, Firestore, Hosting) · Google Maps Places API · Workbox

## Running locally

```bash
git clone https://github.com/KatekaniN/safe-spaces.git
cd safe-spaces
npm install
npm run dev
```

Create a `.env` file with your own keys:

```
VITE_GOOGLE_MAPS_API_KEY=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_USE_FIREBASE_EMULATORS=false
```

Deploy with `npm run deploy` (builds, then runs `firebase deploy`).

## Author

Katekani Nyamandi, Software Engineer, South Africa
