# ChatFlow Web Frontend (`@chatflow/web`)

The frontend client for **ChatFlow**, built with Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and DaisyUI v5. Designed for modern, fast real-time messaging inspired by WhatsApp Web and Telegram.

---

## Features

- **Responsive Chat Interface**: Fluid split-view desktop layout and mobile single-panel view with conversation switching.
- **Real-Time Messaging**: Socket.IO integration with real-time incoming message dispatch, optimistic updates, and delivery acknowledgements.
- **Online Presence**: Real-time indicators showing active users with multi-tab connection reference counting.
- **Profile Management**: Profile modal for updating display name, selecting from 8 curated avatar personas, or providing a custom image URL with live broadcast to other participants.
- **32 Theme Presets**: Full support for DaisyUI light and dark themes (dark, night, dracula, emerald, synthwave, etc.) with local storage persistence and an inline head script to eliminate hydration flash.
- **Progressive Web App (PWA)**: Web App Manifest (`manifest.webmanifest`), standalone mobile display, and a dedicated service worker (`sw.js`) that caches static shell assets while strictly bypassing API routes and WebSockets.
- **Cold-Start Resilience**: Visual connection status indicator (`connected`, `reconnecting`, `disconnected`) with automatic ticket refreshing on reconnection, plus wake-up notices on auth pages during free-tier cold starts.

---

## Dual-Protocol Architecture

The frontend uses a dual-protocol model to ensure high security and seamless cross-origin handling between Vercel and Render:

1. **Same-Origin REST API Proxy (Next.js Rewrites)**:
   - In production, REST calls default to relative paths (`/api/...`).
   - Next.js server-side rewrites in `next.config.ts` forward `/api/:path*` to the Render backend service specified by `INTERNAL_API_URL`.
   - **Benefit**: Browsers treat requests as first-party/same-origin, allowing HTTP-only `auth_token` cookies to be sent and received without third-party cookie restrictions.

2. **Direct WebSocket Connection (Socket.IO)**:
   - The browser opens a direct WebSocket connection to the Render service (`NEXT_PUBLIC_SOCKET_URL`).
   - Before handshaking, the socket client calls `fetchSocketTicket()` to fetch a fresh, short-lived 60-second JWT ticket from the same-origin `/api/auth/socket-token` endpoint.
   - **Benefit**: No long-lived session secrets or cookies are exposed over cross-origin WebSocket handshakes or stored in JavaScript storage.

---

## Directory Structure

```text
apps/web/
├── public/
│   ├── icons/                  # PWA and app icons
│   ├── manifest.webmanifest    # Web App Manifest
│   ├── offline.html            # Offline fallback page
│   └── sw.js                   # Service Worker (caches shell only)
├── src/
│   ├── app/
│   │   ├── api/health/         # Local Next.js health check endpoint
│   │   ├── login/              # Sign in page with cold-start wake-up notice
│   │   ├── register/           # Registration page with cold-start wake-up notice
│   │   ├── globals.css         # Global CSS and Tailwind directives
│   │   ├── layout.tsx          # Root layout, Geist font, anti-flicker theme script
│   │   └── page.tsx            # Main chat interface and state coordinator
│   ├── components/
│   │   ├── ChatPanel.tsx       # Message thread, composer, emoji picker
│   │   ├── ConversationList.tsx# Conversation list, search, presence dots
│   │   ├── EmptyState.tsx      # Welcome placeholder when no chat is active
│   │   ├── NewConversationModal.tsx # Start new direct chat dialog
│   │   ├── ProfileModal.tsx    # Edit profile and appearance theme picker
│   │   └── Toast.tsx           # Toast notification provider and hook
│   ├── lib/
│   │   ├── api.ts              # API URL resolver (relative vs absolute)
│   │   ├── socket.ts           # Singleton Socket.IO client with dynamic auth
│   │   ├── theme.ts            # Theme definitions and localStorage helpers
│   │   └── utils.ts            # Avatar helpers and timestamp formatting
│   └── types/
│       └── chat.ts             # Shared frontend chat models and socket events
├── next.config.ts              # Next.js config with rewrites and Turbopack rules
└── package.json
```

---

## Environment Variables

| Variable | Required in Dev | Required in Prod | Description |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_API_URL` | Optional (`http://localhost:5000`) | Omit / Empty | Base URL for REST API. In production, omit or leave empty to use relative same-origin paths (`/api/...`). |
| `NEXT_PUBLIC_SOCKET_URL`| Optional (`http://localhost:5000`) | **Yes** | Direct HTTPS URL to backend on Render (e.g., `https://chatflow-dia0.onrender.com`). |
| `INTERNAL_API_URL` | No | **Yes (on Vercel)** | Backend URL used by Next.js rewrites to proxy `/api/:path*` to Render. |

---

## Available Scripts

Run from repository root:
```bash
npm run dev:web        # Start Next.js development server on http://localhost:3000
npm run build:web      # Build production bundle with Next.js
npm run start:web      # Run production server
npm run typecheck:web  # Run TypeScript typecheck (tsc --noEmit)
npm run test:web       # Run unit tests (tsx --test src/**/*.test.ts)
```

Or from `apps/web`:
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```
