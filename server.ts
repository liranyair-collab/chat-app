import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

        // Check if message mentions @g
        if (message.text.toLowerCase().includes("@g")) {
          const prompt = message.text.replace(/@g/gi, "").trim();
          const history = roomMessages[room].slice(-10);

          try {
            const aiMsgId = `ai-${Date.now()}`;
            let fullText = "";

            io.to(room).emit("ai-start", { id: aiMsgId });

            const model = genAI.getGenerativeModel({
              model: "gemini-1.5-flash",
              systemInstruction:
                "You are a helpful AI assistant participating in a group chat. Be concise and friendly. Reply in the same language as the user.",
            });

            const historyText = history
              .map((m) => `${m.author}: ${m.text}`)
              .join("\n");
            const fullPrompt = historyText
              ? `${historyText}\n\n${prompt || message.text}`
              : prompt || message.text;

            const result = await model.generateContentStream(fullPrompt);

            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                fullText += text;
                io.to(room).emit("ai-delta", { id: aiMsgId, text: fullText });
              }
            }

            const aiMessage: Message = {
              id: aiMsgId,
              room,
              author: "Gemini",
              text: fullText,
              timestamp: Date.now(),
              isAI: true,
            };
            roomMessages[room].push(aiMessage);
            io.to(room).emit("ai-done", aiMessage);
          } catch (err: any) {
            console.error("AI error:", err);
            const errMsg = err?.message || String(err);
            io.to(room).emit("ai-error", {
              text: `Gemini error: ${errMsg}`,
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
