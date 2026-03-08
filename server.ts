import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import Anthropic from "@anthropic-ai/sdk";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123";

interface Message {
  id: string;
  room: string;
  author: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
}

interface UserStats {
  totalRequests: number;
  dailyRequests: number;
  lastResetDate: string; // YYYY-MM-DD
  blocked: boolean;
  dailyLimit: number; // 0 = unlimited
}

// In-memory store per room
const roomMessages: Record<string, Message[]> = {};

// Per-user AI usage tracking
const userStats: Record<string, UserStats> = {};

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOrCreateStats(username: string): UserStats {
  if (!userStats[username]) {
    userStats[username] = {
      totalRequests: 0,
      dailyRequests: 0,
      lastResetDate: getTodayDate(),
      blocked: false,
      dailyLimit: 0,
    };
  }
  const stats = userStats[username];
  const today = getTodayDate();
  if (stats.lastResetDate !== today) {
    stats.dailyRequests = 0;
    stats.lastResetDate = today;
  }
  return stats;
}

function isAllowed(username: string): { allowed: boolean; reason?: string } {
  const stats = getOrCreateStats(username);
  if (stats.blocked) return { allowed: false, reason: "blocked by admin" };
  if (stats.dailyLimit > 0 && stats.dailyRequests >= stats.dailyLimit) {
    return { allowed: false, reason: `daily limit of ${stats.dailyLimit} reached` };
  }
  return { allowed: true };
}

function recordRequest(username: string) {
  const stats = getOrCreateStats(username);
  stats.totalRequests++;
  stats.dailyRequests++;
}

// Admin API handler
function handleAdminRequest(req: IncomingMessage, res: ServerResponse): boolean {
  const url = parse(req.url || "", true);
  const { pathname } = url;

  if (!pathname?.startsWith("/api/admin")) return false;

  // Auth check via header or query param
  const secret = req.headers["x-admin-secret"] || url.query.secret;
  if (secret !== ADMIN_SECRET) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return true;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  // GET /api/admin/users — list all users with stats
  if (pathname === "/api/admin/users" && req.method === "GET") {
    const users = Object.entries(userStats).map(([username, stats]) => ({
      username,
      ...stats,
    }));
    res.writeHead(200);
    res.end(JSON.stringify(users));
    return true;
  }

  // PATCH /api/admin/users/:username — update user settings
  const match = pathname.match(/^\/api\/admin\/users\/(.+)$/);
  if (match && req.method === "PATCH") {
    const username = decodeURIComponent(match[1]);
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const stats = getOrCreateStats(username);
        if (typeof data.blocked === "boolean") stats.blocked = data.blocked;
        if (typeof data.dailyLimit === "number") stats.dailyLimit = data.dailyLimit;
        res.writeHead(200);
        res.end(JSON.stringify({ username, ...stats }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return true;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
  return true;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    if (handleAdminRequest(req, res)) return;
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join", ({ room, username }: { room: string; username: string }) => {
      socket.join(room);
      const history = roomMessages[room] ?? [];
      socket.emit("history", history);

      io.to(room).emit("system", {
        text: `${username} joined the room`,
        timestamp: Date.now(),
      });
    });

    socket.on(
      "message",
      async ({ room, message }: { room: string; message: Message }) => {
        if (!roomMessages[room]) roomMessages[room] = [];
        roomMessages[room].push(message);

        io.to(room).emit("message", message);

        // Check if message mentions @g
        if (message.text.toLowerCase().includes("@g")) {
          const check = isAllowed(message.author);
          if (!check.allowed) {
            io.to(room).emit("ai-error", {
              text: `@${message.author} cannot use AI: ${check.reason}`,
            });
            return;
          }

          const prompt = message.text.replace(/@g/gi, "").trim();
          const history = roomMessages[room].slice(-10);

          try {
            const aiMsgId = `ai-${Date.now()}`;
            let fullText = "";

            io.to(room).emit("ai-start", { id: aiMsgId });
            recordRequest(message.author);

            const historyText = history
              .map((m) => `${m.author}: ${m.text}`)
              .join("\n");
            const fullPrompt = historyText
              ? `${historyText}\n\n${prompt || message.text}`
              : prompt || message.text;

            const stream = anthropic.messages.stream({
              model: "claude-haiku-4-5",
              max_tokens: 1024,
              system:
                "You are a helpful AI assistant participating in a group chat. Be concise and friendly. Reply in the same language as the user.",
              messages: [{ role: "user", content: fullPrompt }],
            });

            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                fullText += event.delta.text;
                io.to(room).emit("ai-delta", { id: aiMsgId, text: fullText });
              }
            }

            const aiMessage: Message = {
              id: aiMsgId,
              room,
              author: "Claude",
              text: fullText,
              timestamp: Date.now(),
              isAI: true,
            };
            roomMessages[room].push(aiMessage);
            io.to(room).emit("ai-done", aiMessage);
          } catch (err: unknown) {
            console.error("AI error:", err);
            const errMsg = err instanceof Anthropic.APIError
              ? `${err.status}: ${err.message}`
              : String(err);
            io.to(room).emit("ai-error", {
              text: `Claude error: ${errMsg}`,
            });
          }
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
