import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import Anthropic from "@anthropic-ai/sdk";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

interface Message {
  id: string;
  room: string;
  author: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
}

// In-memory store per room
const roomMessages: Record<string, Message[]> = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
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
      // Send history
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

        // Broadcast to room
        io.to(room).emit("message", message);

        // Check if message mentions @claude
        if (message.text.toLowerCase().includes("@claude")) {
          const prompt = message.text.replace(/@claude/gi, "").trim();
          const history = roomMessages[room].slice(-10);

          try {
            const aiMsgId = `ai-${Date.now()}`;
            let fullText = "";

            io.to(room).emit("ai-start", { id: aiMsgId });

            const historyText = history
              .map((m) => `${m.author}: ${m.text}`)
              .join("\n");
            const fullPrompt = historyText
              ? `${historyText}\n\n${prompt || message.text}`
              : prompt || message.text;

            const stream = anthropic.messages.stream({
              model: "claude-opus-4-6",
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
