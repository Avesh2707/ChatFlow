"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";
import { Conversation, CurrentUser, Message, SocketAckResponse } from "../types/chat";
import ConversationList from "../components/ConversationList";
import ChatPanel from "../components/ChatPanel";
import EmptyState from "../components/EmptyState";
import NewConversationModal from "../components/NewConversationModal";
import ProfileModal from "../components/ProfileModal";
import { getAvatarBg, getInitials } from "../lib/utils";
import { getStoredTheme, applyTheme, DEFAULT_THEME } from "../lib/theme";
import { useToast } from "../components/Toast";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export default function Home() {
  const { success, error: toastError, info, warning } = useToast();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState<ConnectionStatus>("disconnected");

  // Real Online Presence tracking
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Theme state (32 DaisyUI themes)
  const [activeTheme, setActiveTheme] = useState<string>(DEFAULT_THEME);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // Messages state for active conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Modals state
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<"profile" | "appearance">("profile");

  const openProfileModal = (tab: "profile" | "appearance" = "profile") => {
    setProfileModalTab(tab);
    setProfileModalOpen(true);
  };

  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversation ? activeConversation.id : null;

  const previousSocketStatus = useRef<ConnectionStatus>("disconnected");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Initialize theme from persistence
  useEffect(() => {
    const saved = getStoredTheme();
    setActiveTheme(saved);
    applyTheme(saved);
  }, []);

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    applyTheme(themeId);
  };

  // Check authenticated session
  const checkAuth = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      disconnectSocket();
      setSocketStatus("disconnected");
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setCurrentUser(null);
      setActiveConversation(null);
      setConversations([]);
      setMessages([]);
      info("Logged out successfully");
    } catch (err) {
      console.error("Logout failed:", err);
      toastError("Failed to logout cleanly");
    }
  };

  // Fetch all user conversations
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    setConversationsError(null);
    try {
      const res = await fetch(`${apiUrl}/api/conversations`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to load conversations (${res.status})`);
      }
      const data = await res.json();
      const loaded: Conversation[] = data.conversations || [];
      setConversations(loaded);

      // Join socket rooms for active conversations
      const socket = getSocket();
      if (socket.connected) {
        loaded.forEach((conv) => {
          socket.emit("conversation:join", { conversationId: conv.id });
        });
      }
    } catch (err: unknown) {
      setConversationsError(
        err instanceof Error ? err.message : "Failed to load conversations"
      );
    } finally {
      setLoadingConversations(false);
    }
  }, [apiUrl]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true);
      setMessagesError(null);
      setSendError(null);
      try {
        const res = await fetch(
          `${apiUrl}/api/conversations/${conversationId}/messages`,
          {
            credentials: "include",
          }
        );
        if (!res.ok) {
          throw new Error(`Failed to load messages (${res.status})`);
        }
        const data = await res.json();
        if (activeConversationIdRef.current === conversationId) {
          setMessages(data.messages || []);
        }
      } catch (err: unknown) {
        if (activeConversationIdRef.current === conversationId) {
          setMessagesError(
            err instanceof Error ? err.message : "Failed to load messages"
          );
        }
      } finally {
        if (activeConversationIdRef.current === conversationId) {
          setLoadingMessages(false);
        }
      }
    },
    [apiUrl]
  );

  // Send message over Socket.IO with acknowledgement
  const handleSendMessage = async (content: string): Promise<boolean> => {
    if (!activeConversation) return false;
    const conversationId = activeConversation.id;
    setSendError(null);

    const socket = getSocket();
    if (!socket.connected) {
      const msg = "Cannot send: reconnecting to chat server...";
      setSendError(msg);
      toastError(msg);
      connectSocket();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      socket.emit(
        "message:send",
        {
          conversationId,
          content,
        },
        (ack: SocketAckResponse<Message>) => {
          if (ack.success) {
            if (ack.message) {
              const savedMsg = ack.message;
              setMessages((prev) => {
                if (prev.some((m) => m.id === savedMsg.id)) return prev;
                return [...prev, savedMsg];
              });

              setConversations((prev) => {
                const existingIndex = prev.findIndex((c) => c.id === savedMsg.conversationId);
                if (existingIndex === -1) return prev;
                const updatedConv: Conversation = {
                  ...prev[existingIndex],
                  updatedAt: savedMsg.createdAt,
                  messages: [
                    {
                      id: savedMsg.id,
                      content: savedMsg.content,
                      senderId: savedMsg.senderId,
                      createdAt: savedMsg.createdAt,
                    },
                  ],
                };
                const nextList = [...prev];
                nextList.splice(existingIndex, 1);
                nextList.unshift(updatedConv);
                return nextList;
              });
            }
            resolve(true);
          } else {
            const errText = ack.error || "Failed to deliver message";
            setSendError(errText);
            toastError(errText);
            resolve(false);
          }
        }
      );
    });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
    fetchMessages(conversation.id);

    const socket = getSocket();
    if (socket.connected) {
      socket.emit("conversation:join", { conversationId: conversation.id });
    }
  };

  const handleConversationCreated = (conversation: Conversation) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conversation.id);
      if (exists) return prev;
      return [conversation, ...prev];
    });

    const socket = getSocket();
    if (socket.connected) {
      socket.emit("conversation:join", { conversationId: conversation.id });
    }
    handleSelectConversation(conversation);
  };

  const handleUserUpdated = (updatedUser: CurrentUser) => {
    setCurrentUser(updatedUser);
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        participants: c.participants.map((p) =>
          p.userId === updatedUser.id
            ? { ...p, user: { ...p.user, name: updatedUser.name, avatar: updatedUser.avatar } }
            : p
        ),
      }))
    );
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Socket lifecycle and real-time listeners
  useEffect(() => {
    if (!currentUser) {
      disconnectSocket();
      setSocketStatus("disconnected");
      setOnlineUserIds(new Set());
      return;
    }

    const socket = connectSocket();

    const onConnect = () => {
      if (previousSocketStatus.current === "reconnecting") {
        success("Reconnected to chat server");
      }
      setSocketStatus("connected");
      previousSocketStatus.current = "connected";

      if (activeConversationIdRef.current) {
        socket.emit("conversation:join", {
          conversationId: activeConversationIdRef.current,
        });
      }
    };

    const onDisconnect = () => {
      setSocketStatus("disconnected");
      previousSocketStatus.current = "disconnected";
    };

    const onReconnectAttempt = () => {
      setSocketStatus("reconnecting");
      if (previousSocketStatus.current !== "reconnecting") {
        warning("Connection lost. Reconnecting...");
      }
      previousSocketStatus.current = "reconnecting";
    };

    // Presence handlers
    const onPresenceState = (payload: { onlineUserIds: string[] }) => {
      setOnlineUserIds(new Set(payload.onlineUserIds));
    };

    const onPresenceOnline = (payload: { userId: string }) => {
      setOnlineUserIds((prev) => new Set([...prev, payload.userId]));
    };

    const onPresenceOffline = (payload: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
    };

    // Live user profile updates
    const onUserUpdatedBroadcast = (payload: { user: { id: string; name: string; email: string; avatar?: string | null } }) => {
      if (payload.user.id === currentUser.id) {
        setCurrentUser((prev) => (prev ? { ...prev, ...payload.user } : null));
      }
      setConversations((prev) =>
        prev.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p.userId === payload.user.id
              ? { ...p, user: { ...p.user, name: payload.user.name, avatar: payload.user.avatar } }
              : p
          ),
        }))
      );
    };

    const onNewMessage = (newMsg: Message) => {
      if (activeConversationIdRef.current === newMsg.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }

      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.id === newMsg.conversationId);
        if (existingIndex === -1) {
          fetchConversations();
          return prev;
        }

        const updatedConv: Conversation = {
          ...prev[existingIndex],
          updatedAt: newMsg.createdAt,
          messages: [
            {
              id: newMsg.id,
              content: newMsg.content,
              senderId: newMsg.senderId,
              createdAt: newMsg.createdAt,
            },
          ],
        };

        const nextList = [...prev];
        nextList.splice(existingIndex, 1);
        nextList.unshift(updatedConv);
        return nextList;
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onNewMessage);
    socket.on("presence:state", onPresenceState);
    socket.on("presence:online", onPresenceOnline);
    socket.on("presence:offline", onPresenceOffline);
    socket.on("user:updated", onUserUpdatedBroadcast);
    socket.io.on("reconnect_attempt", onReconnectAttempt);

    if (socket.connected) {
      setSocketStatus("connected");
      previousSocketStatus.current = "connected";
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onNewMessage);
      socket.off("presence:state", onPresenceState);
      socket.off("presence:online", onPresenceOnline);
      socket.off("presence:offline", onPresenceOffline);
      socket.off("user:updated", onUserUpdatedBroadcast);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
    };
  }, [currentUser, fetchConversations, success, warning]);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser, fetchConversations]);

  // Loading Session State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner text-primary loading-sm"></span>
      </div>
    );
  }

  // Unauthenticated Landing State
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-between p-6 sm:p-10 font-sans selection:bg-primary selection:text-primary-content">
        <div className="max-w-2xl w-full mx-auto space-y-12">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-base-300 pb-4">
            <div className="flex items-center gap-2.5">
              <svg
                className="w-5 h-5 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-base font-bold tracking-tight">
                ChatFlow
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs px-3.5 py-1.5 rounded-xl text-base-content/80 hover:text-base-content hover:bg-base-200 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-xs px-3.5 py-1.5 rounded-xl bg-primary text-primary-content font-medium shadow hover:opacity-95 transition-opacity"
              >
                Create Account
              </Link>
            </div>
          </header>

          {/* Hero */}
          <section className="text-center py-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <span>✦ WhatsApp & Telegram Inspired</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              Simple, instant real-time messaging.
            </h2>
            <p className="text-sm text-base-content/60 max-w-md mx-auto leading-relaxed">
              Fast, direct 1-to-1 conversations with persistent history, online presence, and 32 customizable themes.
            </p>
            <div className="flex items-center justify-center gap-3 pt-4">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-content text-xs font-semibold shadow hover:opacity-90 active:scale-95 transition-all"
              >
                Sign In to Chat
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-base-200 hover:bg-base-300 text-base-content text-xs font-semibold border border-base-300 transition-all"
              >
                Create Account
              </Link>
            </div>
          </section>
        </div>

        <footer className="max-w-2xl w-full mx-auto pt-6 border-t border-base-300 text-xs text-base-content/50 text-center">
          ChatFlow &bull; Real-Time Messenger
        </footer>
      </div>
    );
  }

  // Determine other participant in active conversation
  const otherParticipant = activeConversation
    ? activeConversation.participants.find((p) => p.userId !== currentUser.id)?.user
    : null;
  const isOtherOnline = otherParticipant ? onlineUserIds.has(otherParticipant.id) : false;

  // Authenticated Chat Layout
  return (
    <div className="h-screen w-screen bg-base-100 text-base-content flex flex-col overflow-hidden font-sans selection:bg-primary selection:text-primary-content">
      {/* Top Application Navbar */}
      <header className="h-13 px-4 bg-base-200 border-b border-base-300 flex items-center justify-between gap-4 shrink-0 z-20">
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs font-bold tracking-tight">
              ChatFlow
            </span>
          </div>

          {/* Unobtrusive Single Connection Indicator */}
          <div className="flex items-center gap-1.5 pl-2.5 border-l border-base-300 text-[11px] text-base-content/60">
            <span
              className={`w-2 h-2 rounded-full ${
                socketStatus === "connected"
                  ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : socketStatus === "reconnecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500"
              }`}
            />
            {socketStatus === "reconnecting" && <span>Reconnecting...</span>}
            {socketStatus === "disconnected" && <span>Offline</span>}
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-2">
          {/* Accessible Theme Switcher Button */}
          <button
            onClick={() => openProfileModal("appearance")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-base-300 bg-base-100 hover:bg-base-300 text-xs text-base-content/85 hover:text-base-content transition-all cursor-pointer shadow-xs"
            title={`Current theme: ${activeTheme}. Click to choose from 32 DaisyUI themes`}
            aria-label={`Current theme: ${activeTheme}. Click to choose from 32 DaisyUI themes`}
          >
            <svg
              className="w-4 h-4 text-primary shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
            </svg>
            <span className="hidden sm:inline capitalize font-medium">{activeTheme}</span>
          </button>

          {/* User Profile & Settings Button */}
          <button
            onClick={() => openProfileModal("profile")}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-base-300/80 bg-base-100 hover:bg-base-300 transition-all cursor-pointer group shadow-xs"
            title="Profile & account settings"
            aria-label="Profile & account settings"
          >
            <div className="relative shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-6.5 h-6.5 rounded-full object-cover bg-base-300 ring-1 ring-base-300/80"
                />
              ) : (
                <div
                  className={`w-6.5 h-6.5 rounded-full ${getAvatarBg(
                    currentUser.email
                  )} flex items-center justify-center text-[10px] font-bold select-none`}
                >
                  {getInitials(currentUser.name)}
                </div>
              )}
            </div>
            <span className="text-xs font-semibold hidden md:inline group-hover:text-primary transition-colors max-w-[120px] truncate">
              {currentUser.name}
            </span>
            <svg
              className="w-3.5 h-3.5 text-base-content/50 group-hover:text-primary transition-colors shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs px-2.5 py-1.5 rounded-xl text-base-content/60 hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Responsive Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            activeConversation ? "hidden md:flex" : "flex"
          } w-full md:w-80 lg:w-92 shrink-0 flex-col h-full`}
        >
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversation?.id || null}
            onSelectConversation={handleSelectConversation}
            onOpenNewModal={() => setNewChatModalOpen(true)}
            loading={loadingConversations}
            error={conversationsError}
            onRetry={fetchConversations}
            currentUser={currentUser}
            onlineUserIds={onlineUserIds}
          />
        </div>

        {/* Chat Panel Area */}
        <div
          className={`${
            activeConversation ? "flex" : "hidden md:flex"
          } flex-1 flex-col h-full min-w-0`}
        >
          {activeConversation ? (
            <ChatPanel
              conversation={activeConversation}
              currentUser={currentUser}
              messages={messages}
              loadingMessages={loadingMessages}
              messagesError={messagesError}
              onRetryMessages={() => fetchMessages(activeConversation.id)}
              onSendMessage={handleSendMessage}
              onBackToSidebar={() => setActiveConversation(null)}
              sendError={sendError}
              onDismissSendError={() => setSendError(null)}
              isOnline={isOtherOnline}
            />
          ) : (
            <EmptyState
              onOpenNewModal={() => setNewChatModalOpen(true)}
              totalConversations={conversations.length}
            />
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onConversationCreated={handleConversationCreated}
        apiUrl={apiUrl}
      />

      {/* Profile & 32-Theme Selector Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={handleUserUpdated}
        activeTheme={activeTheme}
        onThemeChange={handleThemeChange}
        apiUrl={apiUrl}
        initialTab={profileModalTab}
      />
    </div>
  );
}
