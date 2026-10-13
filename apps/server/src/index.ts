import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";

const startServer = () => {
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    console.log(`[ChatFlow Server] Running in ${env.NODE_ENV} mode`);
    console.log(`[ChatFlow Server] Listening on http://localhost:${env.PORT}`);
    console.log(`[ChatFlow Server] Health check available at http://localhost:${env.PORT}/health`);
  });

  const handleShutdown = (signal: string) => {
    console.log(`\n[ChatFlow Server] Received ${signal}. Gracefully shutting down...`);
    server.close(() => {
      console.log("[ChatFlow Server] HTTP server closed.");
      process.exit(0);
    });

    // Force close after 10s timeout
    setTimeout(() => {
      console.error("[ChatFlow Server] Forcefully shutting down after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
};

startServer();
