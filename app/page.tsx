"use client";

import { useState } from "react";
import ChatRoom from "@/components/ChatRoom";

export default function Home() {
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("general");

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) setJoined(true);
  };

  if (joined) {
    return <ChatRoom username={username} room={room} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Chat App</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Mention{" "}
          <span className="font-mono bg-gray-100 px-1 rounded">@claude</span>{" "}
          in any message to talk to the AI
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              maxLength={20}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Room
            </label>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="general">General</option>
              <option value="tech">Tech</option>
              <option value="random">Random</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
}
