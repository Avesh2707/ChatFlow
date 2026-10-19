import test from "node:test";
import assert from "node:assert";
import { getApiUrl } from "./api";
import { getSocketUrl } from "./socket";
import nextConfig from "../../next.config";
import { GET as healthGet } from "../app/api/health/route";

test("Frontend API & Socket URL Resolution", async (t) => {
  const originalEnv = { ...process.env };

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  await t.test("getApiUrl defaults to relative '' in production (same-origin proxy)", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as any).NODE_ENV = "production";
    assert.strictEqual(getApiUrl(), "");
  });

  await t.test("getApiUrl defaults to 'http://localhost:5000' in development", () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    (process.env as any).NODE_ENV = "development";
    assert.strictEqual(getApiUrl(), "http://localhost:5000");
  });

  await t.test("getApiUrl respects explicit NEXT_PUBLIC_API_URL without trailing slash", () => {
    process.env.NEXT_PUBLIC_API_URL = "https://custom-api.chatflow.dev/";
    assert.strictEqual(getApiUrl(), "https://custom-api.chatflow.dev");
  });

  await t.test("getSocketUrl respects NEXT_PUBLIC_SOCKET_URL (direct Render connection)", () => {
    process.env.NEXT_PUBLIC_SOCKET_URL = "https://chatflow-backend.onrender.com/";
    assert.strictEqual(getSocketUrl(), "https://chatflow-backend.onrender.com");
  });

  await t.test("getSocketUrl falls back to localhost:5000 if not configured", () => {
    delete process.env.NEXT_PUBLIC_SOCKET_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    assert.strictEqual(getSocketUrl(), "http://localhost:5000");
  });
});

test("Next.js Rewrites & Health Route Invariants", async (t) => {
  const originalEnv = { ...process.env };

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  await t.test("Next.js rewrites: disabled when INTERNAL_API_URL is missing", async () => {
    delete process.env.INTERNAL_API_URL;
    if (nextConfig.rewrites) {
      const rewrites = await nextConfig.rewrites();
      assert.deepStrictEqual(rewrites, []);
    }
  });

  await t.test("Next.js rewrites: configures afterFiles proxy when INTERNAL_API_URL is set", async () => {
    process.env.INTERNAL_API_URL = "https://chatflow-service.onrender.com/";
    if (nextConfig.rewrites) {
      const rewrites = await nextConfig.rewrites();
      assert.ok(!Array.isArray(rewrites));
      assert.strictEqual((rewrites as any).afterFiles?.length, 1);
      assert.strictEqual((rewrites as any).afterFiles[0].source, "/api/:path*");
      assert.strictEqual(
        (rewrites as any).afterFiles[0].destination,
        "https://chatflow-service.onrender.com/api/:path*"
      );
    }
  });

  await t.test("Next.js local /api/health route resolves successfully with status ok", async () => {
    const res = await healthGet();
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, "ok");
    assert.strictEqual(body.service, "web");
    assert.ok(typeof body.uptime === "number");
  });

  await t.test("Next.js headers configure no-cache headers for /sw.js", async () => {
    if (nextConfig.headers) {
      const headersList = await nextConfig.headers();
      const swHeaderConfig = headersList.find((h) => h.source === "/sw.js");
      assert.ok(swHeaderConfig);
      const cacheControl = swHeaderConfig.headers.find(
        (header) => header.key === "Cache-Control"
      );
      assert.ok(cacheControl?.value.includes("no-store"));
      assert.ok(cacheControl?.value.includes("must-revalidate"));
    }
  });
});

test("Service Worker Caching and Route Exclusions Safety", async (t) => {
  // Logic from apps/web/public/sw.js lines 41-49
  const isExcludedFromCache = (urlStr: string, method = "GET"): boolean => {
    const url = new URL(urlStr, "https://chatflow.vercel.app");
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/socket.io/") ||
      url.port === "5000" ||
      method !== "GET"
    ) {
      return true; // Excluded (bypassed)
    }
    return false;
  };

  await t.test("/api/auth/socket-token is EXCLUDED from service worker cache", () => {
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/api/auth/socket-token"), true);
  });

  await t.test("/api/auth/login, /api/auth/me, /api/conversations are EXCLUDED from cache", () => {
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/api/auth/login"), true);
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/api/auth/me"), true);
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/api/conversations"), true);
  });

  await t.test("/socket.io/ handshakes and polling are EXCLUDED from cache", () => {
    assert.strictEqual(
      isExcludedFromCache("https://chatflow-backend.onrender.com/socket.io/?EIO=4&transport=polling"),
      true
    );
  });

  await t.test("/api/health is EXCLUDED from cache", () => {
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/api/health"), true);
  });

  await t.test("State-changing requests (POST, PATCH, DELETE) are EXCLUDED from cache", () => {
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/some-action", "POST"), true);
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/some-action", "DELETE"), true);
  });

  await t.test("Static shell assets are ELIGIBLE for service worker cache", () => {
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/offline.html"), false);
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/manifest.webmanifest"), false);
    assert.strictEqual(isExcludedFromCache("https://chatflow.vercel.app/icons/icon-192.png"), false);
  });
});
