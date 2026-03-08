"use client";

import { useState, useEffect, useCallback } from "react";

interface UserStats {
  username: string;
  totalRequests: number;
  dailyRequests: number;
  lastResetDate: string;
  blocked: boolean;
  dailyLimit: number;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const fetchUsers = useCallback(async (s: string) => {
    const res = await fetch("/api/admin/users", {
      headers: { "x-admin-secret": s },
    });
    if (res.status === 401) {
      setError("סיסמה שגויה");
      return;
    }
    const data = await res.json();
    setUsers(data);
    setAuthed(true);
    setError("");
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(secret);
  };

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => fetchUsers(secret), 5000);
    return () => clearInterval(interval);
  }, [authed, secret, fetchUsers]);

  async function updateUser(username: string, patch: Partial<UserStats>) {
    setSaving(username);
    await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify(patch),
    });
    await fetchUsers(secret);
    setSaving(null);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin</h1>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Admin secret..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              כניסה
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">ניהול משתמשים</h1>
          <span className="text-xs text-gray-400">מתרענן כל 5 שניות</span>
        </div>

        {users.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400">
            אין משתמשים עדיין. משתמשים יופיעו כאן לאחר שישתמשו ב-@claude.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">משתמש</th>
                  <th className="px-4 py-3 text-center">היום</th>
                  <th className="px-4 py-3 text-center">סה"כ</th>
                  <th className="px-4 py-3 text-center">מגבלה יומית</th>
                  <th className="px-4 py-3 text-center">חסום</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.username} className={u.blocked ? "bg-red-50" : ""}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {u.username}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {u.dailyRequests}
                      {u.dailyLimit > 0 && (
                        <span className="text-gray-400"> / {u.dailyLimit}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {u.totalRequests}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min={0}
                        defaultValue={u.dailyLimit}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          if (val !== u.dailyLimit) updateUser(u.username, { dailyLimit: val });
                        }}
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        title="0 = ללא מגבלה"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => updateUser(u.username, { blocked: !u.blocked })}
                        disabled={saving === u.username}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                          u.blocked
                            ? "bg-red-100 text-red-700 hover:bg-red-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        } disabled:opacity-50`}
                      >
                        {saving === u.username ? "..." : u.blocked ? "חסום" : "פעיל"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400 text-center">
          מגבלה יומית: 0 = ללא מגבלה. לחץ על הכפתור לחסימה/שחרור.
        </p>
      </div>
    </div>
  );
}
