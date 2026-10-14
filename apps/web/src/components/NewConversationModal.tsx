"use client";

import { useState, useEffect, useRef } from "react";
import { Conversation } from "../types/chat";
import { useToast } from "./Toast";

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
  apiUrl: string;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated,
  apiUrl,
}: NewConversationModalProps) {
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/conversations/direct`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipientEmail: trimmedEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.message || data.error || "Failed to start conversation";
        setError(msg);
        toastError(msg);
        return;
      }

      if (data.conversation) {
        success("Chat started successfully!");
        onConversationCreated(data.conversation);
        onClose();
      } else {
        setError("Invalid response received from server");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to server";
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="fixed inset-0"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm bg-base-200 border border-base-300 rounded-2xl p-5 shadow-2xl z-10 space-y-4 text-base-content">
        <div className="flex items-center justify-between pb-2 border-b border-base-300">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <h3 id="modal-title" className="text-sm font-semibold">
              New Direct Chat
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-base-content/60 hover:text-base-content p-1 rounded-lg hover:bg-base-300 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-xs text-base-content/70 leading-normal">
          Enter the registered email address of the person you want to chat with.
        </p>

        {error && (
          <div className="p-2.5 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-center gap-2">
            <span className="font-bold shrink-0">✕</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="recipient-email"
              className="block text-xs font-medium text-base-content/80 mb-1.5"
            >
              Recipient Email
            </label>
            <input
              ref={inputRef}
              id="recipient-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              disabled={loading}
              className="w-full px-3 py-2 rounded-xl bg-base-100 border border-base-300 text-xs focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-base-300 hover:bg-base-300/80 text-base-content/80 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="px-4 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-content hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
            >
              {loading ? "Starting..." : "Start Chat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
