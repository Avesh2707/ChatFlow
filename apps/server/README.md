# ChatFlow Backend Server (`@chatflow/server`)

The backend server for **ChatFlow**, built with Express 4, Socket.IO 4, Prisma ORM 6, and PostgreSQL. Provides REST APIs for authentication and conversations, plus real-time messaging and presence tracking via WebSockets.

---

## Features & Security Architecture

- **Strict Environment Validation**: Validated at startup using Zod (`src/config/env.ts`). Disallows development placeholders, loopback addresses, or insecure HTTP in production.
- **HTTP-Only Cookie Authentication**: Session tokens are signed JWTs stored exclusively in `httpOnly`, `sameSite: "lax"`, `secure` cookies (`auth_token`). Never exposed in response bodies.
- **Dedicated Socket Ticket Isolation**: WebSockets are authenticated using short-lived 60-second tickets (`{ type: "socket_ticket" }`). Handshakes strictly reject session tokens, and REST endpoints strictly reject socket tickets.
- **CSRF Protection**: Origin and Referer validation middleware (`validateOrigin`) protects all state-changing endpoints (`POST`, `PUT`, `DELETE`, `PATCH`).
- **Race-Condition-Safe Conversations**: Direct (1-on-1) chats use a canonical deterministic key (`userA:userB` with sorted UUIDs) enforced by a unique database constraint (`directKey`), preventing duplicate conversations during concurrent creation.
- **Chronological Message History**: `GET /api/conversations/:id/messages` queries the latest 100 messages (`orderBy: { createdAt: "desc" }, take: 100`) and returns them in ascending chronological order for the UI.
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` to close Socket.IO connections, disconnect the Prisma client, and drain active HTTP connections with a 10s fallback timeout.

---

## Directory Structure

```text
apps/server/
├── prisma/
│   ├── migrations/             # Timestamped SQL migrations
│   └── schema.prisma           # Database schema (User, Conversation, Participant, Message)
├── src/
│   ├── config/
│   │   └── env.ts              # Zod environment schema & runtime validator
│   ├── controllers/
│   │   ├── auth.controller.ts  # Register, login, logout, getMe, updateProfile, getSocketToken
│   │   └── conversation.controller.ts # List, create direct, get messages
│   ├── db/
│   │   └── index.ts            # Prisma client singleton, health check, directKey helper
│   ├── middlewares/
│   │   ├── auth.middleware.ts  # Verifies auth_token cookie
│   │   └── csrf.middleware.ts  # Validates Origin/Referer against CLIENT_URL
│   ├── routes/
│   │   ├── auth.routes.ts      # /api/auth routes
│   │   ├── conversation.routes.ts # /api/conversations routes
│   │   └── health.routes.ts    # /health route
│   ├── schemas/
│   │   ├── auth.schema.ts      # Zod validation for auth payloads
│   │   └── conversation.schema.ts # Zod validation for conversation payloads
│   ├── socket/
│   │   ├── index.ts            # Socket.IO initialization, auth middleware, rooms & events
│   │   └── types.ts            # Typed client/server event signatures
│   ├── utils/
│   │   ├── jwt.ts              # Token signing, verification, and cookie options
│   │   └── password.ts         # Bcrypt password hashing and comparison
│   ├── app.ts                  # Express application factory & middleware pipeline
│   └── index.ts                # HTTP server launcher and graceful shutdown
└── package.json
```

---

## REST API Reference

### Health
- `GET /health` — Public endpoint reporting service status (`ok`), uptime, and database connectivity latency.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Create account (`name`, `email`, `password`).
- `POST /api/auth/login` — Sign in with `email` and `password`. Sets `auth_token` HTTP-only cookie.
- `POST /api/auth/logout` — Clears `auth_token` cookie.
- `GET /api/auth/me` *(Protected)* — Get current user profile.
- `PATCH /api/auth/me` *(Protected)* — Update display `name` and/or `avatar`. Broadcasts update to connected sockets.
- `GET /api/auth/socket-token` *(Protected)* — Issues short-lived (60s) ticket for Socket.IO connection. Headers include `Cache-Control: no-store, private`.

### Conversations (`/api/conversations`)
- `GET /api/conversations` *(Protected)* — List all conversations for the authenticated user, ordered by last activity with recent message preview.
- `POST /api/conversations` *(Protected)* — Create or retrieve existing direct conversation by `recipientId` or `recipientEmail`.
- `GET /api/conversations/:id/messages` *(Protected)* — Retrieve the latest 100 messages for a conversation in chronological order. Verifies caller is a participant.

---

## Socket.IO Real-Time Events

### Connection Handshake
Clients connect to `/` with an auth payload:
```javascript
io(SOCKET_URL, {
  auth: { token: "<60s-socket-ticket>" }
});
```

### Client &rarr; Server Events
- `conversation:join` — `{ conversationId: string }` &rarr; joins room `conversation:<id>` after verifying participant authorization.
- `message:send` — `{ conversationId: string, content: string }` &rarr; persists message, updates conversation timestamp, broadcasts to room, returns ack.
- `presence:query` — Requests current online user list.

### Server &rarr; Client Events
- `presence:state` — `{ onlineUserIds: string[] }` sent to newly connected socket.
- `presence:online` — `{ userId: string }` broadcast when user connects their first active session.
- `presence:offline` — `{ userId: string }` broadcast when user disconnects their last active session.
- `message:new` — Broadcasts persisted message to all sockets in `conversation:<id>`.
- `user:updated` — Broadcasts updated profile to all connected sockets.

---

## Environment Variables

| Variable | Dev Default | Production Requirement | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `5000` | Injected by Render | Port for Express & Socket.IO server. |
| `NODE_ENV` | `development` | `production` | Runtime mode. Enables strict security checks in production. |
| `CLIENT_URL` | `http://localhost:3000` | **Required (HTTPS)** | Allowed origin for CORS, CSRF, and WebSockets. |
| `DATABASE_URL` | Docker postgres | **Required (Neon)** | PostgreSQL connection URL for Prisma ORM. |
| `JWT_SECRET` | Dev fallback | **Required (&ge; 32 chars)** | Secret key used to sign session tokens and socket tickets. |
| `JWT_EXPIRES_IN`| `7d` | `7d` | Expiration time for session tokens. |

---

## Available Scripts

Run from repository root:
```bash
npm run dev:server        # Start server with file watching via tsx
npm run build:server      # Run prisma generate && tsc
npm run start:server      # Run compiled server (node dist/index.js)
npm run typecheck:server  # Run TypeScript type check (tsc --noEmit)
npm run test:server       # Run unit and integration tests (tsx --test src/**/*.test.ts)
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run dev migrations (prisma migrate dev)
npm run prisma:deploy     # Run production migrations (prisma migrate deploy)
npm run prisma:studio     # Open Prisma Studio web GUI
```

Or from `apps/server`:
```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
```
