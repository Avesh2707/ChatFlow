"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ServiceStatus {
  status: "idle" | "loading" | "online" | "offline";
  details?: {
    status?: string;
    service?: string;
    timestamp?: string;
    uptime?: number;
    database?: string;
  };
  error?: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function Home() {
  const [webStatus, setWebStatus] = useState<ServiceStatus>({ status: "loading" });
  const [serverStatus, setServerStatus] = useState<ServiceStatus>({ status: "loading" });
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const checkWebHealth = async () => {
    setWebStatus({ status: "loading" });
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWebStatus({ status: "online", details: data });
    } catch (err: unknown) {
      setWebStatus({
        status: "offline",
        error: err instanceof Error ? err.message : "Failed to connect",
      });
    }
  };

  const checkServerHealth = async () => {
    setServerStatus({ status: "loading" });
    try {
      const res = await fetch(`${apiUrl}/health`, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setServerStatus({ status: "online", details: data });
    } catch (err: unknown) {
      setServerStatus({
        status: "offline",
        error: err instanceof Error ? err.message : "Server unreachable",
      });
    }
  };

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

  const handleLogout = async () => {
    try {
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setCurrentUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    checkWebHealth();
    checkServerHealth();
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl w-full mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-3.5 w-3.5 rounded-full bg-indigo-500 animate-pulse" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
                ChatFlow
              </h1>
              <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Phase 3 (Auth Ready)
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Real-time one-to-one messaging platform architecture.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!authLoading && currentUser ? (
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400">{currentUser.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-xs px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : !authLoading ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-sm"
                >
                  Register
                </Link>
              </div>
            ) : null}

            <button
              onClick={() => {
                checkWebHealth();
                checkServerHealth();
                checkAuth();
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors font-medium text-slate-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Phase 1 Verification Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Frontend Service Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                  FE
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Next.js Web Service</h2>
                  <p className="text-xs text-slate-400">apps/web (Port 3000)</p>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  webStatus.status === "online"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : webStatus.status === "loading"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {webStatus.status === "online" && "Online"}
                {webStatus.status === "loading" && "Checking..."}
                {webStatus.status === "offline" && "Offline"}
              </span>
            </div>

            <div className="bg-slate-950/60 rounded-lg p-3 text-xs font-mono border border-slate-800/80 space-y-1 text-slate-300">
              <div className="text-slate-500 text-[11px] mb-1 font-sans">ENDPOINT: /api/health</div>
              {webStatus.status === "online" && (
                <>
                  <div>Status: <span className="text-emerald-400">{webStatus.details?.status}</span></div>
                  <div>Service: {webStatus.details?.service}</div>
                  <div>Uptime: {Math.floor(webStatus.details?.uptime || 0)}s</div>
                </>
              )}
              {webStatus.status === "offline" && (
                <div className="text-rose-400">Error: {webStatus.error}</div>
              )}
              {webStatus.status === "loading" && (
                <div className="text-slate-400 animate-pulse">Requesting health check...</div>
              )}
            </div>
          </div>

          {/* Backend Service Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-lg backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                  BE
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Express & Socket Server</h2>
                  <p className="text-xs text-slate-400">apps/server (Port 5000)</p>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  serverStatus.status === "online"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : serverStatus.status === "loading"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {serverStatus.status === "online" && "Online"}
                {serverStatus.status === "loading" && "Checking..."}
                {serverStatus.status === "offline" && "Offline / Not Started"}
              </span>
            </div>

            <div className="bg-slate-950/60 rounded-lg p-3 text-xs font-mono border border-slate-800/80 space-y-1 text-slate-300">
              <div className="text-slate-500 text-[11px] mb-1 font-sans">ENDPOINT: http://localhost:5000/health</div>
              {serverStatus.status === "online" && (
                <>
                  <div>Status: <span className="text-emerald-400">{serverStatus.details?.status}</span></div>
                  <div>Service: {serverStatus.details?.service}</div>
                  <div>Uptime: {Math.floor(serverStatus.details?.uptime || 0)}s</div>
                </>
              )}
              {serverStatus.status === "offline" && (
                <div className="text-amber-400/90 font-sans">
                  Server is offline or not running yet. Run <code className="font-mono text-white">npm run dev:server</code> to start it.
                </div>
              )}
              {serverStatus.status === "loading" && (
                <div className="text-slate-400 animate-pulse">Checking backend connection...</div>
              )}
            </div>
          </div>
        </section>

        {/* Monorepo Architecture Overview */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Phase 1 Monorepo Architecture
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-1">
              <div className="font-medium text-slate-200">apps/web</div>
              <div className="text-slate-400">Next.js App Router, TypeScript, Tailwind CSS</div>
              <div className="text-indigo-400 font-mono mt-1">npm run dev:web</div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-1">
              <div className="font-medium text-slate-200">apps/server</div>
              <div className="text-slate-400">Node.js, Express, TypeScript, Zod, CORS</div>
              <div className="text-teal-400 font-mono mt-1">npm run dev:server</div>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-1">
              <div className="font-medium text-slate-200">PostgreSQL (Docker)</div>
              <div className="text-slate-400">compose.yaml (Postgres 16 Alpine, port 5432)</div>
              <div className="text-sky-400 font-mono mt-1">docker compose up -d</div>
            </div>
          </div>
        </section>
      </div>

      <footer className="max-w-4xl w-full mx-auto pt-8 border-t border-slate-900 text-xs text-slate-500 text-center">
        ChatFlow &bull; Phase 1 Verification &bull; Next.js 16 + Express + Docker Compose
      </footer>
    </div>
  );
}
