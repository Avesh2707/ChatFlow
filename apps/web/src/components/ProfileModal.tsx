"use client";

import React, { useState, useEffect } from "react";
import { CurrentUser } from "../types/chat";
import { THEMES, ThemeInfo } from "../lib/theme";
import { getAvatarBg, getInitials } from "../lib/utils";
import { useToast } from "./Toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  onUserUpdated: (user: CurrentUser) => void;
  activeTheme: string;
  onThemeChange: (themeId: string) => void;
  apiUrl: string;
  initialTab?: "profile" | "appearance";
}

// 8 Curated persona avatar presets (using SVG DiceBear / unDraw avatars)
export const AVATAR_PRESETS = [
  { id: "preset-1", name: "Alex", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Alex" },
  { id: "preset-2", name: "Jordan", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Jordan" },
  { id: "preset-3", name: "Morgan", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Morgan" },
  { id: "preset-4", name: "Taylor", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Taylor" },
  { id: "preset-5", name: "Sam", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Sam" },
  { id: "preset-6", name: "Riley", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Riley" },
  { id: "preset-7", name: "Casey", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Casey" },
  { id: "preset-8", name: "Jamie", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Jamie" },
];

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  activeTheme,
  onThemeChange,
  apiUrl,
  initialTab = "profile",
}: ProfileModalProps) {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"profile" | "appearance">(initialTab);

  // Profile Form state
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState<string | null>(currentUser.avatar || null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Theme filter state
  const [themeFilter, setThemeFilter] = useState<"all" | "dark" | "light">("all");
  const [themeSearch, setThemeSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setName(currentUser.name);
      setAvatar(currentUser.avatar || null);
      setFormError(null);
    }
  }, [currentUser, isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }
    if (trimmedName.length > 50) {
      setFormError("Name cannot exceed 50 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          avatar: avatar || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to update profile");
      }

      onUserUpdated(data.user);
      success("Profile updated successfully!");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setFormError(msg);
      error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customAvatarUrl.trim()) {
      setAvatar(customAvatarUrl.trim());
      setCustomAvatarUrl("");
    }
  };

  const filteredThemes = THEMES.filter((t) => {
    if (themeFilter === "dark" && !t.isDark) return false;
    if (themeFilter === "light" && t.isDark) return false;
    if (themeSearch.trim() && !t.name.toLowerCase().includes(themeSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-base-200 border border-base-300 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-base-content">
        {/* Modal Header */}
        <div className="h-14 px-5 border-b border-base-300 flex items-center justify-between shrink-0 bg-base-100/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="font-semibold text-sm">Settings & Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-base-300 text-base-content/60 hover:text-base-content transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-base-300 px-5 pt-2 gap-4 text-xs font-medium bg-base-100/30 shrink-0">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === "appearance"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            Themes & Colors ({THEMES.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "profile" ? (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs">
                  {formError}
                </div>
              )}

              {/* Avatar Preview & Selection */}
              <div>
                <label className="block text-xs font-medium text-base-content/80 mb-2">
                  Avatar
                </label>
                <div className="flex items-center gap-4 p-3 bg-base-100/60 rounded-xl border border-base-300/80 mb-3">
                  <div className="relative">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        onError={() => setAvatar(null)}
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 rounded-full ${getAvatarBg(
                          currentUser.email
                        )} flex items-center justify-center text-lg font-bold select-none border-2 border-primary/50`}
                      >
                        {getInitials(name || currentUser.name)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{name || currentUser.name}</p>
                    <p className="text-[11px] text-base-content/60 truncate">{currentUser.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => setAvatar(null)}
                          className="text-[11px] px-2 py-0.5 rounded bg-base-300 hover:bg-base-300/80 text-base-content/80 transition-colors cursor-pointer"
                        >
                          Reset to Initials
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Avatars */}
                <p className="text-[11px] text-base-content/60 mb-2">Select from avatar presets:</p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-3">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = avatar === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatar(preset.url)}
                        className={`p-1 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? "ring-2 ring-primary bg-primary/10"
                            : "hover:bg-base-300/50"
                        }`}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-10 h-10 rounded-full bg-base-300"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Custom Image URL */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="Or enter custom image URL (https://...)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-base-100 border border-base-300 text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    disabled={!customAvatarUrl.trim()}
                    className="px-3 py-1.5 rounded-lg bg-base-300 hover:bg-base-300/80 text-xs font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Use URL
                  </button>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-medium text-base-content/80 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-base-100 border border-base-300 text-xs focus:outline-none focus:border-primary transition-colors"
                />
                <div className="flex justify-between items-center text-[10px] text-base-content/50 mt-1">
                  <span>Visible to your conversation partners</span>
                  <span>{name.length}/50</span>
                </div>
              </div>

              {/* Account Email (Read-only) */}
              <div>
                <label className="block text-xs font-medium text-base-content/80 mb-1.5">
                  Account Email
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-base-100/50 border border-base-300/50 text-xs text-base-content/70">
                  <span className="truncate">{currentUser.email}</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
                    Verified
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-base-300 hover:bg-base-300/80 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-content font-medium text-xs shadow hover:opacity-90 active:scale-98 transition-all disabled:opacity-40 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Theme Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search 32 themes..."
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-base-100 border border-base-300 text-xs focus:outline-none focus:border-primary"
                />
                <div className="flex gap-1 bg-base-100 p-0.5 rounded-lg border border-base-300 text-[11px]">
                  <button
                    onClick={() => setThemeFilter("all")}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      themeFilter === "all" ? "bg-primary text-primary-content font-semibold" : "text-base-content/70"
                    }`}
                  >
                    All (32)
                  </button>
                  <button
                    onClick={() => setThemeFilter("dark")}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      themeFilter === "dark" ? "bg-primary text-primary-content font-semibold" : "text-base-content/70"
                    }`}
                  >
                    Dark (12)
                  </button>
                  <button
                    onClick={() => setThemeFilter("light")}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      themeFilter === "light" ? "bg-primary text-primary-content font-semibold" : "text-base-content/70"
                    }`}
                  >
                    Light (20)
                  </button>
                </div>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {filteredThemes.map((theme: ThemeInfo) => {
                  const isSelected = activeTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => onThemeChange(theme.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary"
                          : "border-base-300 bg-base-100 hover:border-base-content/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold truncate">{theme.name}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-base-content/60">
                        <span>{theme.isDark ? "Dark" : "Light"}</span>
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-xs"
                          style={{ backgroundColor: theme.accent }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
