"use client";

import { useState, useEffect, useRef } from "react";
import { Conversation, CurrentUser, Message } from "../types/chat";
import { formatMessageTime, getAvatarBg, getInitials } from "../lib/utils";

interface ChatPanelProps {
  conversation: Conversation;
  currentUser: CurrentUser;
  messages: Message[];
  loadingMessages: boolean;
  messagesError: string | null;
  onRetryMessages: () => void;
  onSendMessage: (content: string) => Promise<boolean>;
  onBackToSidebar: () => void;
  sendError: string | null;
  onDismissSendError: () => void;
  isOnline?: boolean;
}

const EMOJI_LIST = [
  "👍", "❤️", "😊", "😂", "🔥", "🎉",
  "👋", "🙏", "👏", "✨", "🚀", "💯",
  "🤝", "👀", "😎", "💡", "😢", "🙌",
  "🥳", "💬"
];

export default function ChatPanel({
  conversation,
  currentUser,
  messages,
  loadingMessages,
  messagesError,
  onRetryMessages,
  onSendMessage,
  onBackToSidebar,
  sendError,
  onDismissSendError,
  isOnline = false,
}: ChatPanelProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== currentUser.id
  )?.user;
  const otherName = otherParticipant?.name || "User";
  const otherEmail = otherParticipant?.email || "";
  const otherAvatar = otherParticipant?.avatar || null;

  // Auto-scroll to bottom on messages update
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, [messages.length, conversation.id]);

  useEffect(() => {
    textareaRef.current?.focus();
    setShowEmojiPicker(false);
  }, [conversation.id]);

  // Click outside to close emoji picker
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
        textareaRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEmojiPicker]);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const success = await onSendMessage(trimmed);
    setSending(false);

    if (success) {
      setContent("");
      setShowEmojiPicker(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      setTimeout(() => scrollToBottom("smooth"), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    setContent(el.value);
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleSelectEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-base-100 text-base-content flex-1 min-w-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-base-300 bg-base-200/90 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          <button
            onClick={onBackToSidebar}
            className="md:hidden p-1.5 -ml-1 rounded-lg text-base-content/70 hover:text-base-content hover:bg-base-300/80 transition-colors cursor-pointer"
            aria-label="Back to chats"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Participant Avatar with Presence Indicator */}
          <div className="relative shrink-0">
            {otherAvatar ? (
              <img
                src={otherAvatar}
                alt={otherName}
                className="w-9 h-9 rounded-full object-cover bg-base-300 ring-1 ring-base-300/80"
              />
            ) : (
              <div
                className={`w-9 h-9 rounded-full ${getAvatarBg(
                  otherEmail || otherName
                )} flex items-center justify-center font-bold text-xs select-none`}
              >
                {getInitials(otherName)}
              </div>
            )}
            {isOnline && (
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-base-200"
                title="Online"
                aria-label="Online"
              />
            )}
          </div>

          {/* Participant Details & Online Presence */}
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold leading-tight truncate text-base-content">
              {otherName}
            </h2>
            <div className="flex items-center gap-1.5 leading-tight mt-0.5 text-[11px] truncate">
              {isOnline ? (
                <span className="font-medium text-emerald-500 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-base-content/50 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-base-content/30" />
                  Offline
                </span>
              )}
              {otherEmail && (
                <span className="text-base-content/40 truncate hidden sm:inline">
                  • {otherEmail}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Feed Area with Clean Canvas (No strong gradients) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-base-200/50">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-base-content/50">Loading messages...</span>
          </div>
        ) : messagesError ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-center">
            <p className="text-xs text-error">{messagesError}</p>
            <button
              onClick={onRetryMessages}
              className="px-3 py-1.5 rounded-xl bg-base-300 hover:bg-base-300/80 text-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2 max-w-xs mx-auto my-auto py-12 select-none">
            <div className="w-12 h-12 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-center text-primary shadow-xs mb-1">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-base-content">
              Start a conversation with {otherName}
            </p>
            <p className="text-[11px] text-base-content/60 leading-relaxed">
              Messages are persistent and delivered instantly in real time.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUser.id;
            const prevMsg = messages[index - 1];
            const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${
                  isSameSender ? "mt-1" : "mt-2.5"
                }`}
              >
                {/* Readable Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] px-4 py-2.5 text-xs sm:text-sm break-words whitespace-pre-wrap leading-relaxed shadow-xs transition-all ${
                    isMe
                      ? "bg-primary text-primary-content rounded-2xl rounded-tr-xs shadow-xs"
                      : "bg-base-100 text-base-content rounded-2xl rounded-tl-xs border border-base-300/80 shadow-xs"
                  }`}
                >
                  <p>{msg.content}</p>
                  <div
                    className={`text-[10px] mt-1.5 text-right select-none font-medium ${
                      isMe ? "text-primary-content/80" : "text-base-content/60"
                    }`}
                  >
                    {formatMessageTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send Error Alert */}
      {sendError && (
        <div className="mx-4 mb-2 p-2.5 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center justify-between gap-2">
          <span>{sendError}</span>
          <button
            onClick={onDismissSendError}
            className="hover:opacity-80 font-bold p-0.5 cursor-pointer"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Composer with On-Demand Compact Emoji Picker */}
      <div className="px-4 py-3 border-t border-base-300 bg-base-200/90 backdrop-blur-xs shrink-0 relative">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2">
          {/* On-Demand Floating Emoji Popover */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full mb-3 left-0 z-30 p-3 bg-base-100 border border-base-300 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150 w-64 max-w-[calc(100vw-2rem)] text-base-content"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-base-300 text-[11px] font-semibold text-base-content/75">
                <span>Quick Emojis</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="p-1 rounded-md text-base-content/50 hover:text-base-content hover:bg-base-200 transition-colors cursor-pointer"
                  aria-label="Close emoji picker"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className="h-8 rounded-lg hover:bg-base-200 active:scale-95 flex items-center justify-center text-base transition-all cursor-pointer select-none"
                    aria-label={`Insert ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji Toggle Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer select-none self-end mb-0.5 ${
              showEmojiPicker
                ? "bg-base-300 text-primary"
                : "text-base-content/60 hover:text-base-content hover:bg-base-300/80"
            }`}
            title="Choose emoji"
            aria-label="Choose emoji"
            aria-expanded={showEmojiPicker}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {/* Message Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherName}...`}
            maxLength={5000}
            disabled={sending}
            className="flex-1 bg-base-100 border border-base-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-base-content placeholder:text-base-content/40 focus:outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/40 resize-none max-h-32 min-h-[42px] leading-relaxed transition-all shadow-xs"
          />

          {content.length > 4500 && (
            <span className="text-[10px] text-warning font-mono self-center shrink-0">
              {5000 - content.length}
            </span>
          )}

          {/* Send Action */}
          <button
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="p-2.5 rounded-xl bg-primary text-primary-content hover:opacity-95 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs self-end mb-0.5"
            title="Send message (Enter)"
            aria-label="Send message"
          >
            <svg
              className="w-4 h-4 rotate-90 transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
