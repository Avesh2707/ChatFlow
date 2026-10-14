"use client";

interface EmptyStateProps {
  onOpenNewModal: () => void;
  totalConversations: number;
}

export default function EmptyState({
  onOpenNewModal,
  totalConversations,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-base-200/50 text-center select-none text-base-content">
      <div className="max-w-sm w-full space-y-4">
        {/* Subtle, clean icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-base-100 border border-base-300 flex items-center justify-center text-primary shadow-xs">
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-semibold">
            {totalConversations > 0 ? "Select a chat" : "No conversations yet"}
          </h2>
          <p className="text-xs text-base-content/60 leading-relaxed">
            {totalConversations > 0
              ? "Select an existing chat from the left sidebar or start a new direct message."
              : "Start your first direct conversation by entering another user's email address."}
          </p>
        </div>

        <div className="pt-1">
          <button
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-content text-xs font-medium shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
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
            <span>{totalConversations > 0 ? "New Chat" : "Start Conversation"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
