"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "../../components/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (name.trim().length < 2) {
      const msg = "Name must be at least 2 characters long.";
      setErrorMessage(msg);
      toastError(msg);
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      const msg = "Please enter a valid email address.";
      setErrorMessage(msg);
      toastError(msg);
      return;
    }

    if (password.length < 8) {
      const msg = "Password must be at least 8 characters long.";
      setErrorMessage(msg);
      toastError(msg);
      return;
    }

    if (password !== confirmPassword) {
      const msg = "Passwords do not match.";
      setErrorMessage(msg);
      toastError(msg);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || data.error || "Registration failed.";
        setErrorMessage(msg);
        toastError(msg);
        return;
      }

      success("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to authentication server.";
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content flex flex-col justify-center items-center p-4 sm:p-8 font-sans selection:bg-primary selection:text-primary-content">
      <div className="w-full max-w-md bg-base-200 border border-base-300 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xs">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <svg
              className="w-6 h-6 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xl font-bold tracking-tight">
              ChatFlow
            </span>
          </Link>
          <h1 className="text-lg font-bold">Create account</h1>
          <p className="text-xs text-base-content/60 mt-1">Get started with real-time conversations</p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2.5">
            <span className="font-bold shrink-0">✕</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1.5" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Johnson"
              required
              autoComplete="name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-base-100 border border-base-300 text-xs placeholder:text-base-content/40 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl bg-base-100 border border-base-300 text-xs placeholder:text-base-content/40 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1.5" htmlFor="password">
              Password (8+ characters)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-base-100 border border-base-300 text-xs placeholder:text-base-content/40 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1.5" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-base-100 border border-base-300 text-xs placeholder:text-base-content/40 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-content hover:opacity-90 active:scale-98 disabled:opacity-50 font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-primary-content/30 border-t-primary-content rounded-full animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-base-300 text-center text-xs text-base-content/60 space-y-2">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold transition-colors">
              Sign in
            </Link>
          </p>
          <p>
            <Link href="/" className="text-[11px] text-base-content/50 hover:text-base-content transition-colors">
              ← Back to ChatFlow
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
