export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt: string;
}

export interface MessageSender {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface Message {
  id: string;
  content: string;
  conversationId: string;
  senderId: string;
  createdAt: string;
  sender?: MessageSender;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  joinedAt: string;
  user: MessageSender;
}

export interface ConversationMessagePreview {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title?: string | null;
  isGroup: boolean;
  directKey?: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages?: ConversationMessagePreview[];
}

export type SocketAckResponse<T = unknown> =
  | { success: true; message?: T; data?: T; conversationId?: string }
  | { success: false; error: string };
