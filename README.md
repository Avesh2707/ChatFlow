# ChatFlow

> A fast, responsive, and secure real-time messaging platform inspired by WhatsApp Web and Telegram. Built with a full-stack TypeScript monorepo using Next.js 16, Express, Socket.IO, Prisma ORM, and PostgreSQL.

[![Live App](https://img.shields.io/badge/Live%20App-chat--flow--seven--chi.vercel.app-blue?style=flat-square&logo=vercel)](https://chat-flow-seven-chi.vercel.app)
[![Backend Status](https://img.shields.io/badge/Backend%20Health-Render%20Live-brightgreen?style=flat-square&logo=render)](https://chatflow-dia0.onrender.com/health)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Avesh2707%2FChatFlow-black?style=flat-square&logo=github)](https://github.com/Avesh2707/ChatFlow)

---

## Live Deployments & Demo

- **Frontend Application (Vercel)**: [https://chat-flow-seven-chi.vercel.app](https://chat-flow-seven-chi.vercel.app)
- **Backend API & Health Status (Render)**: [https://chatflow-dia0.onrender.com/health](https://chatflow-dia0.onrender.com/health)
- **Source Code (GitHub)**: [https://github.com/Avesh2707/ChatFlow](https://github.com/Avesh2707/ChatFlow)

---

## Screenshots

<table width="100%">
  <tr>
    <td width="50%" valign="top" align="center">
      <a href="docs/screenshots/01-homepage.png">
        <img src="docs/screenshots/01-homepage.png" alt="ChatFlow Homepage" width="100%" />
      </a>
      <br />
      <strong>Homepage</strong>
      <p>A clean landing page with quick access to sign in and account creation.</p>
    </td>
    <td width="50%" valign="top" align="center">
      <a href="docs/screenshots/02-chat-interface.png">
        <img src="docs/screenshots/02-chat-interface.png" alt="ChatFlow Real-Time Chat Interface" width="100%" />
      </a>
      <br />
      <strong>Real-Time Chat Interface</strong>
      <p>A one-to-one conversation view with online presence, message history, and a message composer.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center">
      <a href="docs/screenshots/03-theme-gallery.png">
        <img src="docs/screenshots/03-theme-gallery.png" alt="ChatFlow Theme Gallery" width="100%" />
      </a>
      <br />
      <strong>Theme Gallery</strong>
      <p>Browse and choose from 32 DaisyUI themes to personalize the interface.</p>
    </td>
    <td width="50%" valign="top" align="center">
      <a href="docs/screenshots/04-profile-settings.png">
        <img src="docs/screenshots/04-profile-settings.png" alt="ChatFlow Profile Settings" width="100%" />
      </a>
      <br />
      <strong>Profile Settings</strong>
      <p>Customize the display name and choose from avatar presets or enter a custom image URL.</p>
    </td>
  </tr>
</table>

---

## Features

- **Authentication & Security**:
  - Secure registration and login with bcryptjs password hashing (10 salt rounds).
  - Session management using JWTs stored strictly in HTTP-only, `SameSite=Lax`, `Secure` cookies (`auth_token`).
  - Strict CSRF protection via Origin and Referer header validation on all state-changing HTTP endpoints.
  - Dedicated short-lived (60s) Socket.IO connection tickets isolated by purpose claims (`socket_ticket`).
- **Real-Time Direct Messaging**:
  - Instant message delivery and conversation room broadcasting via WebSockets (Socket.IO).
  - Chronological message history (latest 100 messages returned in ascending order for seamless chat UI reading).
  - Delivery acknowledgements with optimistic client UI updates.
  - Quick-pick emoji reaction popover with keyboard shortcut support.
- **Online Presence & Multi-Device Tracking**:
  - Real-time online/offline status indicators.
  - Multi-tab reference counting per user (marks a user offline only when their last tab or device disconnects).
- **Customizable User Profiles**:
  - Display name customization and instant profile broadcast to conversation peers.
  - Avatar selection from 8 curated persona presets or custom image URLs.
- **32 Themes & Appearance**:
  - Full DaisyUI palette support (Dark, Light, Night, Dracula, Synthwave, Cyberpunk, Emerald, etc.).
  - LocalStorage persistence with an inline anti-flicker script in `<head>` to prevent theme flashes on page load.
- **Progressive Web App (PWA)**:
  - Web App Manifest (`manifest.webmanifest`) supporting standalone fullscreen installation on mobile and desktop.
  - Custom Service Worker (`sw.js`) caching shell assets with strict exclusion rules for authenticated API routes and WebSockets.
- **Resilience to Free-Tier Hosting**:
  - Automatic Socket.IO reconnection logic with dynamic ticket refreshing.
  - Visual status badge (`connected`, `reconnecting`, `disconnected`).
  - Calm wake-up notices on authentication forms during backend cold starts.

---

## Architecture

ChatFlow uses a **split production architecture** separating the Next.js frontend, Express/Socket.IO backend, and PostgreSQL database across specialized hosting platforms.

```mermaid
flowchart TD
    User["User Browser / PWA Client"]

    subgraph Vercel ["Vercel Edge Platform"]
        NextWeb["Next.js 16 Web App<br/>(App Router, React 19)"]
        Rewrites["Next.js Server Rewrites<br/>(/api/:path* -> Render)"]
    end

    subgraph Render ["Render Web Service"]
        ExpressApp["Express 4 REST Server"]
        SocketServer["Socket.IO 4 WebSocket Server"]
        AuthMiddleware["JWT Cookie & CSRF Middleware"]
        TicketAuth["60s Ticket Handshake Auth"]
    end

    subgraph Neon ["Neon Serverless"]
        PostgresDB[("PostgreSQL 16 Database<br/>(Prisma ORM Client)")]
    end

    %% REST Flow
    User -->|"1. Page & Shell Load"| NextWeb
    User -->|"2. REST Calls (Same-Origin /api/*)<br/>Sends first-party HTTP-only cookie"| Rewrites
    Rewrites -->|"3. Proxied Internal API Request"| ExpressApp
    ExpressApp --> AuthMiddleware

    %% WebSocket Flow
    User -->|"4. Fetch 60s Socket Ticket<br/>GET /api/auth/socket-token"| Rewrites
    User -->|"5. Direct WSS Connection<br/>auth: { token: ticket }"| SocketServer
    SocketServer --> TicketAuth

    %% Database
    ExpressApp -->|"SQL Queries"| PostgresDB
    SocketServer -->|"Message Persistence"| PostgresDB
```

### Dual-Protocol Communication Pattern

1. **Same-Origin REST API Proxy (Next.js Rewrites)**:
   - In production, browser fetch requests use relative paths (`/api/...`).
   - Next.js server-side rewrites forward `/api/:path*` to the Render backend service (`INTERNAL_API_URL`).
   - **Why?** Eliminates cross-site cookie restrictions (such as Safari ITP and Chrome third-party cookie blocking). The `auth_token` cookie remains first-party to the Vercel domain.

2. **Direct WebSocket Handshake with 60-Second Tickets**:
   - The browser connects directly to Render (`NEXT_PUBLIC_SOCKET_URL`) over WebSockets.
   - To authenticate without exposing long-lived session cookies across origins or storing tokens in JavaScript storage, the client requests a short-lived 60-second ticket from `/api/auth/socket-token`.
   - The client supplies this ticket in the handshake payload (`auth: { token }`). On disconnection or server restart, the client's dynamic auth callback fetches a fresh ticket before reconnecting.

---

## Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack), [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [DaisyUI v5](https://daisyui.com/), [Socket.IO Client](https://socket.io/) |
| **Backend** | [Node.js](https://nodejs.org/) (&ge; 20.9.0), [Express 4](https://expressjs.com/), [Socket.IO 4](https://socket.io/), [Prisma ORM 6](https://www.prisma.io/), [Zod](https://zod.dev/), [bcryptjs](https://github.com/dcodeIO/bcrypt.js), [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) (Docker Compose in dev, [Neon](https://neon.tech/) in production) |
| **Hosting** | [Vercel](https://vercel.com/) (Frontend), [Render](https://render.com/) (Backend Web Service), [Neon](https://neon.tech/) (Serverless Postgres) |
| **Tooling** | npm workspaces, tsx test runner, Docker Compose, ESLint |

---

## Monorepo Directory Structure

```text
ChatFlow/
├── .env.example              # Unified environment template with safe placeholders
├── compose.yaml              # Local PostgreSQL container service definition
├── package.json              # Monorepo root scripts and npm workspaces definition
├── apps/
│   ├── server/               # Express + Socket.IO backend service
│   │   ├── prisma/           # Prisma schema and database migrations
│   │   ├── src/
│   │   │   ├── config/       # Strict environment validation (Zod)
│   │   │   ├── controllers/  # Route handlers (auth, conversations, messages)
│   │   │   ├── db/           # Prisma client singleton and health checks
│   │   │   ├── middlewares/  # Cookie authentication and CSRF origin protection
│   │   │   ├── routes/       # Express route definitions
│   │   │   ├── schemas/      # Input validation schemas (Zod)
│   │   │   ├── socket/       # Socket.IO connection handler, rooms, presence
│   │   │   └── utils/        # JWT utilities and password hashing
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md         # Dedicated server documentation
│   └── web/                  # Next.js App Router frontend application
│       ├── public/           # PWA icons, manifest, service worker (sw.js)
│       ├── src/
│       │   ├── app/          # App router pages (chat, login, register, health)
│       │   ├── components/   # Chat, conversation list, modals, toasts
│       │   ├── lib/          # API, Socket.IO client singleton, themes, utils
│       │   └── types/        # Shared frontend types
│       ├── next.config.ts    # Next.js config with /api/:path* proxy rewrites
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md         # Dedicated web documentation
```

---

## Local Setup & Development

### Prerequisites

- **Node.js**: `v20.9.0` or higher
- **npm**: `v10.0.0` or higher
- **Docker & Docker Compose**: For running local PostgreSQL

### Step-by-Step Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Avesh2707/ChatFlow.git
   cd ChatFlow
   ```

2. **Start the local PostgreSQL container**:
   ```bash
   docker compose up -d
   ```
   *Verifies healthy postgres on port `5432` with database `chatflow_db`.*

3. **Install all workspace dependencies**:
   ```bash
   npm install
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example apps/server/.env
   cp apps/web/.env.example apps/web/.env.local
   ```
   *In local development, the default fallbacks in `apps/server/src/config/env.ts` and `apps/web/src/lib/api.ts` connect seamlessly to `localhost:5000` and `localhost:3000`.*

5. **Run database migrations**:
   ```bash
   npm run prisma:migrate
   ```

6. **Start development servers**:
   ```bash
   npm run dev
   ```
   *Runs `@chatflow/web` on [http://localhost:3000](http://localhost:3000) and `@chatflow/server` on [http://localhost:5000](http://localhost:5000).*

---

## Verified Commands & Scripts

All commands run from the monorepo root:

| Command | Workspace Scope | Description |
| :--- | :--- | :--- |
| `npm run dev` | All Workspaces | Start both Next.js and Express servers concurrently. |
| `npm run dev:web` | `@chatflow/web` | Start Next.js frontend development server. |
| `npm run dev:server` | `@chatflow/server` | Start Express server with `tsx watch`. |
| `npm run build` | All Workspaces | Generate Prisma client and compile both applications. |
| `npm run build:web` | `@chatflow/web` | Next.js production build (`next build`). |
| `npm run build:server` | `@chatflow/server` | Prisma client generation and TypeScript compile (`prisma generate && tsc`). |
| `npm run start:web` | `@chatflow/web` | Run compiled Next.js production server. |
| `npm run start:server` | `@chatflow/server` | Run compiled backend server (`node dist/index.js`). |
| `npm run typecheck` | All Workspaces | Run TypeScript type checks (`tsc --noEmit`) across all packages. |
| `npm run test` | All Workspaces | Run all unit, integration, and regression test suites. |
| `npm run test:server` | `@chatflow/server` | Run backend tests (auth, cookies, socket tickets, message order). |
| `npm run test:web` | `@chatflow/web` | Run frontend tests (URL resolvers, rewrites, service worker rules). |
| `npm run prisma:generate` | `@chatflow/server` | Generate Prisma client from schema. |
| `npm run prisma:migrate` | `@chatflow/server` | Apply pending migrations in development (`prisma migrate dev`). |
| `npm run prisma:deploy` | `@chatflow/server` | Apply pending migrations in production (`prisma migrate deploy`). |
| `npm run prisma:studio` | `@chatflow/server` | Open Prisma Studio database inspector. |

---

## Environment Variables Reference

| Variable | Scope | Development Default | Production Requirement | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Server | `5000` | Injected by Render | HTTP port for Express server. |
| `NODE_ENV` | Server | `development` | `production` | Enables strict checks in production. |
| `CLIENT_URL` | Server | `http://localhost:3000` | `https://chat-flow-seven-chi.vercel.app` | Allowed origin for CORS, CSRF, and Socket.IO. |
| `DATABASE_URL` | Server | `postgresql://chatflow:chatflow_secret@localhost:5432/chatflow_db?schema=public` | Neon connection URL | PostgreSQL connection string. |
| `JWT_SECRET` | Server | Internal dev fallback | &ge; 32 characters secret key | Signing session cookies and socket tickets. |
| `JWT_EXPIRES_IN` | Server | `7d` | `7d` | Lifetime of session tokens. |
| `NEXT_PUBLIC_API_URL` | Web | `http://localhost:5000` | *Omit / leave empty* | Base REST API URL. Empty in prod uses relative proxy rewrites. |
| `NEXT_PUBLIC_SOCKET_URL` | Web | `http://localhost:5000` | `https://chatflow-dia0.onrender.com` | Direct Render WebSocket URL. |
| `INTERNAL_API_URL` | Web (Vercel) | *Not used in dev* | `https://chatflow-dia0.onrender.com` | Target for Next.js `/api/:path*` rewrites. |

---

## Deployment Guide

### 1. Database: Neon PostgreSQL
1. Create a project on [Neon](https://neon.tech).
2. Copy the connection string. Neon provides both direct and pooled (`-pooler`) connection strings.
3. Ensure `?sslmode=require` is appended to the connection string.
4. Run migrations using:
   ```bash
   DATABASE_URL="<your-neon-url>" npm run prisma:deploy
   ```

### 2. Backend: Render Web Service
1. Create a **New Web Service** connected to the GitHub repository.
2. Configure settings:
   - **Root Directory**: Leave blank (monorepo root) or specify `apps/server`.
   - **Build Command**: `npm install && npm run build:server`
   - **Start Command**: `npm run start:server`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `CLIENT_URL`: `https://chat-flow-seven-chi.vercel.app`
   - `JWT_SECRET`: Random secure string with at least 32 characters.
4. Verify deployment:
   - Navigate to `https://<your-render-service>.onrender.com/health`.
   - Status must return `status: "ok"` and `database: { status: "connected" }`.

### 3. Frontend: Vercel
1. Import the repository into [Vercel](https://vercel.com).
2. Configure project settings:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js
3. Add Environment Variables:
   - `INTERNAL_API_URL`: `https://<your-render-service>.onrender.com`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://<your-render-service>.onrender.com`
   - *(Leave `NEXT_PUBLIC_API_URL` empty or omitted so calls use same-origin proxy).*
4. Deploy the project and verify `https://<your-vercel-domain>/api/health`.

---

## Free-Tier Limitations & Operational Notes

- **Render Web Service Cold Starts**: Render free instances spin down automatically after 15 minutes of inactivity. When a user visits the app after a quiet period, the first API request or socket connection may take **30 to 60 seconds** to wake up the server. Both the login and registration forms display a calm notice during prolonged requests.
- **Neon Serverless PostgreSQL Scale-to-Zero**: Neon suspends inactive compute after 5 minutes of idle time. The initial query when resuming may introduce a **1 to 3 second latency** while compute activates.
- **WebSocket Reconnection**: The Socket.IO client continuously monitors connection state. If connection is lost during a host spin-down, the client triggers automatic exponential backoff reconnects and requests a fresh ticket before handshaking.

---

## Security Notes

1. **No Tokens in Storage**: No session JWTs or secrets are stored in `localStorage`, `sessionStorage`, or IndexedDB.
2. **HTTP-Only Cookies**: Session authentication is conducted via HTTP-only cookies with `SameSite=Lax` and `Path=/`.
3. **Dedicated Socket Tickets**: WebSockets authenticate using short-lived 60-second tickets carrying an explicit `{ type: "socket_ticket" }` claim. Session tokens cannot connect to WebSockets, and socket tickets cannot authenticate REST endpoints.
4. **Origin Validation**: All state-changing requests (`POST`, `PUT`, `DELETE`, `PATCH`) validate the incoming `Origin` and `Referer` headers against `CLIENT_URL`.
5. **Sanitized Error Responses**: In `production` mode, internal server errors return generic messages to avoid leaking stack traces or internal schema details.
6. **Input Validation**: All request bodies are strictly parsed and validated using Zod schemas with character bounds (`min` and `max` constraints).
7. **Safe Service Worker Pre-Caching**: The service worker explicitly excludes `/api/` endpoints, `/socket.io/` connections, and non-GET requests from caching to prevent sensitive data leaks.
