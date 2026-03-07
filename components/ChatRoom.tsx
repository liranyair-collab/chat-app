"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  room: string;
  author: string;
  text: string;
  timestamp: number;
  isAI?: boolean;
}

interface SystemEvent {
  text: string;
  timestamp: number;
}

interface Props {
  username: string;
  room: string;
}

export default function ChatRoom({ username, room }: Props) {
  const [messages, setMessages] = useState<(Message | SystemEvent & { type: "system" })[]>([]);
  const [input, setInput] = useState("");
  const [aiStreaming, setAiStreaming] = useState<{ id: string; text: string } | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", { room, username });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("history", (history: Message[]) => {
      setMessages(history as never[]);
    });

    socket.on("message", (msg: Message) => {
      setMessages((prev) => [...prev, msg as never]);
    });

    socket.on("system", (evt: SystemEvent) => {
      setMessages((prev) => [...prev, { ...evt, type: "system" } as never]);
    });

    socket.on("ai-start", ({ id }: { id: string }) => {
      setAiStreaming({ id, text: "" });
    });

    socket.on("ai-delta", ({ id, text }: { id: string; text: string }) => {
      setAiStreaming({ id, text });
    });

    socket.on("ai-done", (msg: Message) => {
      setAiStreaming(null);
      setMessages((prev) => [...prev, msg as never]);
    });

    socket.on("ai-error", ({ text }: { text: string }) => {
      setAiStreaming(null);
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        room,
        author: "Claude",
        text,
        timestamp: Date.now(),
        isAI: true,
      };
      setMessages((prev) => [...prev, errMsg as never]);
    });

    return () => {
      socket.disconnect();
    };
  }, [room, username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiStreaming]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socketRef.current) return;

    const msg: Message = {
      id: `${Date.now()}-${Math.random()}`,
      room,
      author: username,
      text: input.trim(),
      timestamp: Date.now(),
    };

    socketRef.current.emit("message", { room, message: msg });
    setInput("");
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between shadow">
        <div>
          <span className="font-bold text-lg">#{room}</span>
          <span className="ml-3 text-indigo-200 text-sm">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <span className="text-indigo-200 text-sm">{username}</span>
      </div>

      {/* Hint */}
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2 text-xs text-indigo-500">
        Tip: mention{" "}
        <code className="bg-indigo-100 px-1 rounded">@claude</code> to ask the
        AI a question
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m, i) => {
          if ((m as { type?: string }).type === "system") {
            const s = m as unknown as SystemEvent;
            return (
              <div key={i} className="text-center text-xs text-gray-400 py-1">
                {s.text}
              </div>
            );
          }

          const msg = m as Message;
          const isMe = msg.author === username;
          const isAI = msg.isAI;

          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isAI
                    ? "bg-amber-50 border border-amber-200 text-gray-800"
                    : isMe
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200 text-gray-800"
                }`}
              >
                {!isMe && (
                  <div
                    className={`text-xs font-semibold mb-1 ${
                      isAI ? "text-amber-600" : "text-indigo-600"
                    }`}
                  >
                    {msg.author}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <div
                  className={`text-xs mt-1 ${
                    isMe ? "text-indigo-200" : "text-gray-400"
                  } text-right`}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming AI message */}
        {aiStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl px-4 py-2 bg-amber-50 border border-amber-200 text-gray-800">
              <div className="text-xs font-semibold mb-1 text-amber-600">
                Claude
              </div>
              <p className="text-sm whitespace-pre-wrap">
                {aiStreaming.text}
                <span className="inline-block w-1 h-4 bg-amber-400 ml-0.5 animate-pulse align-text-bottom" />
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="px-4 py-3 bg-white border-t border-gray-200 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message #${room}... (mention @claude for AI)`}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          disabled={!connected}
        />
        <button
          type="submit"
          disabled={!connected || !input.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
