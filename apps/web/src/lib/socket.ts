import { io, Socket } from "socket.io-client";
import { getApiUrl } from "./api";

let socketInstance: Socket | null = null;

/**
 * Resolves the Socket.IO server target URL.
 * - In production: connects directly to NEXT_PUBLIC_SOCKET_URL (the public Render HTTPS URL).
 * - In development: falls back to NEXT_PUBLIC_API_URL or "http://localhost:5000".
 */
export const getSocketUrl = (): string => {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (socketUrl) {
    return socketUrl.replace(/\/$/, "");
  }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    return apiUrl.replace(/\/$/, "");
  }
  return "http://localhost:5000";
};

/**
 * Requests a fresh short-lived (60s) Socket.IO ticket from the same-origin REST API.
 * Uses HTTP-only session cookie authentication over the same-origin connection.
 * Never stores or persists tickets in localStorage, sessionStorage, or URLs.
 */
export const fetchSocketTicket = async (): Promise<string | null> => {
  const apiUrl = getApiUrl();
  try {
    const res = await fetch(`${apiUrl}/api/auth/socket-token`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (typeof data === "object" && data !== null && typeof data.token === "string") {
      return data.token;
    }
    return null;
  } catch (err) {
    console.warn("[ChatFlow Socket] Failed to retrieve connection ticket:", err);
    return null;
  }
};

/**
 * Returns a singleton Socket.IO client instance configured with dynamic auth callback.
 * On every connection and reconnection attempt (including after backend sleep/restart),
 * the auth callback fetches a fresh ticket so expired tickets are never sent.
 */
export const getSocket = (): Socket => {
  if (!socketInstance) {
    const socketUrl = getSocketUrl();

    socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: async (cb) => {
        try {
          const ticket = await fetchSocketTicket();
          if (ticket) {
            cb({ token: ticket });
          } else {
            // If ticket cannot be fetched (e.g. unauthenticated or local dev cookie mode),
            // pass empty auth object so backend can attempt cookie fallback or reject cleanly.
            cb({});
          }
        } catch {
          cb({});
        }
      },
    });
  }

  return socketInstance;
};

/**
 * Connects the socket if currently disconnected.
 */
export const connectSocket = (): Socket => {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

/**
 * Disconnects the socket when user logs out.
 */
export const disconnectSocket = (): void => {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }
};
