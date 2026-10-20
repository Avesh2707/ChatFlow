"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "../../components/Toast";
import { getApiUrl } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWakingUp, setIsWakingUp] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loading) {
      timer = setTimeout(() => {
        setIsWakingUp(true);
      }, 3500);
    } else {
      setIsWakingUp(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading]);

  const apiUrl = getApiUrl();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic client-side validation
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure HTTP-only cookie is stored by browser
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.message || data.error || "Login failed. Please check your credentials.";
        setErrorMessage(msg);
        toastError(msg);
        return;
      }

      success("Login successful! Redirecting...");
      setTimeout(() => {
        router.push("/");
      }, 500);
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
          <h1 className="text-lg font-bold">Welcome back</h1>
          <p className="text-xs text-base-content/60 mt-1">Sign in to your account</p>
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
            <label className="block text-xs font-medium text-base-content/70 mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-xl bg-base-100 border border-base-300 text-xs placeholder:text-base-content/40 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-base-content/70 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {isWakingUp && (
            <div className="p-3 rounded-xl bg-info/10 border border-info/30 text-info text-xs flex items-start gap-2.5">
              <svg
                className="w-4 h-4 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Connecting to the server. The free hosting service may be waking up after inactivity — thank you for your patience!</span>
            </div>
          )}
        </form>

        {/* Footer Navigation */}
        <div className="mt-8 pt-6 border-t border-base-300 text-center text-xs text-base-content/60 space-y-2">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-semibold transition-colors">
              Create an account
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
