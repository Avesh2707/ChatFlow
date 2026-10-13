import { JwtUserPayload } from "../utils/jwt";

export interface AuthenticatedSocketData {
  user: JwtUserPayload;
  userId: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
}

export interface SafeMessage {
  id: string;
  content: string;
  conversationId: string;
  senderId: string;
  createdAt: Date;
  sender: SafeUser;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
}

export type SocketAckResponse<T = unknown> =
  | { success: true; data?: T; message?: T; conversationId?: string }
  | { success: false; error: string };

export interface ServerToClientEvents {
  "message:new": (message: SafeMessage) => void;
  error: (err: { message: string }) => void;
}

export interface ClientToServerEvents {
  "conversation:join": (
    payload: JoinConversationPayload,
    ack?: (res: SocketAckResponse) => void
  ) => void;
  "message:send": (
    payload: SendMessagePayload,
    ack?: (res: SocketAckResponse<SafeMessage>) => void
  ) => void;
}
