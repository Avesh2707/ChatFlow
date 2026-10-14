"use client";

import { useState, useMemo } from "react";
import { Conversation, CurrentUser } from "../types/chat";
import { formatConversationTime, getAvatarBg, getInitials } from "../lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
  onOpenNewModal: () => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  currentUser: CurrentUser;
  onlineUserIds?: Set<string>;
}

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewModal,
  loading,
  error,
  onRetry,
  currentUser,
  onlineUserIds = new Set(),
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter((c) => {
      const other = c.participants.find((p) => p.userId !== currentUser.id)?.user;
      if (!other) return false;
      return (
        other.name.toLowerCase().includes(q) ||
        other.email.toLowerCase().includes(q) ||
        c.messages?.[0]?.content?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, currentUser.id]);

  return (
    <div className="flex flex-col h-full bg-base-200 border-r border-base-300 text-base-content select-none">
      {/* Sidebar Header & Search */}
      <div className="px-3.5 pt-3.5 pb-2.5 border-b border-base-300/80 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">
              Chats
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-base-300 font-medium text-base-content/70">
              {conversations.length}
            </span>
          </div>
          <button
            onClick={onOpenNewModal}
            className="p-1.5 rounded-lg text-base-content/70 hover:text-base-content hover:bg-base-300/80 transition-colors cursor-pointer"
            title="Start new chat"
            aria-label="Start new chat"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="w-3.5 h-3.5 text-base-content/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full pl-8.5 pr-7 py-1.5 rounded-xl bg-base-100 border border-base-300/80 text-xs placeholder:text-base-content/40 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content p-0.5 cursor-pointer"
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Conversation List Scroll Area */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {loading && conversations.length === 0 ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-base-300/40 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-base-300 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-base-300 rounded" />
                  <div className="h-2.5 w-36 bg-base-300/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-xs text-error">{error}</p>
            <button
              onClick={onRetry}
              className="px-2.5 py-1 rounded bg-base-300 hover:bg-base-300/80 text-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center space-y-2 my-auto">
            {searchQuery ? (
              <>
                <p className="text-xs text-base-content/60">
                  No chats match &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-primary hover:underline transition-colors cursor-pointer"
                >
                  Clear filter
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-base-content/90">No conversations yet</p>
                <p className="text-[11px] text-base-content/50">
                  Start a direct chat with another user.
                </p>
                <button
                  onClick={onOpenNewModal}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-content text-xs font-medium shadow hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Chat</span>
                </button>
              </>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const other = conv.participants.find(
              (p) => p.userId !== currentUser.id
            )?.user;
            const otherName = other?.name || "User";
            const otherEmail = other?.email || "";
            const otherAvatar = other?.avatar || null;
            const isOnline = other ? onlineUserIds.has(other.id) : false;
            const isSelected = conv.id === activeConversationId;
            const latestMessage = conv.messages?.[0];
            const isMe = latestMessage?.senderId === currentUser.id;
            const timePreview = formatConversationTime(
              latestMessage?.createdAt || conv.updatedAt || conv.createdAt
            );

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`relative w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer group ${
                  isSelected
                    ? "bg-primary/10 hover:bg-primary/15 shadow-xs text-base-content"
                    : "hover:bg-base-300/50 text-base-content/90 hover:text-base-content"
                }`}
              >
                {/* Active Selection Indicator Pill */}
                {isSelected && (
                  <span
                    className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}

                {/* Avatar with Genuine Presence Badge */}
                <div className="relative shrink-0">
                  {otherAvatar ? (
                    <img
                      src={otherAvatar}
                      alt={otherName}
                      className="w-10 h-10 rounded-full object-cover bg-base-300 ring-1 ring-base-300/80"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full ${getAvatarBg(
                        otherEmail || otherName
                      )} flex items-center justify-center font-bold text-xs select-none ring-1 ring-base-300/50`}
                    >
                      {getInitials(otherName)}
                    </div>
                  )}

                  {/* Real Online Indicator Dot */}
                  {isOnline && (
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-base-200"
                      title="Online"
                      aria-label="Online"
                    />
                  )}
                </div>

                {/* Details & Alignment */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5 leading-tight">
                    <span
                      className={`text-xs truncate ${
                        isSelected
                          ? "font-semibold text-base-content"
                          : "font-medium text-base-content/90 group-hover:text-base-content"
                      }`}
                    >
                      {otherName}
                    </span>
                    <span
                      className={`text-[10px] shrink-0 font-medium ${
                        isSelected ? "text-primary font-semibold" : "text-base-content/50"
                      }`}
                    >
                      {timePreview}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 leading-tight">
                    <p
                      className={`text-xs truncate ${
                        isSelected
                          ? "text-base-content/80 font-normal"
                          : "text-base-content/60 group-hover:text-base-content/80"
                      }`}
                    >
                      {latestMessage ? (
                        <>
                          {isMe && (
                            <span className="text-base-content/50 font-medium">
                              You:{" "}
                            </span>
                          )}
                          <span>{latestMessage.content}</span>
                        </>
                      ) : (
                        <span className="italic opacity-50">No messages yet</span>
                      )}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
