import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

/**
 * Returns a singleton Socket.IO client instance configured with credentials.
 * autoConnect is disabled to prevent opening connections before authentication.
 */
export const getSocket = (): Socket => {
  if (!socketInstance) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:5000";

    socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: false, // Ensures socket only opens when explicitly requested
      transports: ["websocket", "polling"],
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
