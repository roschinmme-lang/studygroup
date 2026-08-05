import React, { useState, useEffect, useCallback } from "react";
import { X, Send } from "lucide-react";
import { Avatar } from "./Shared.jsx";
import { fetchThread, sendMessage } from "../lib/messagesApi.js";
import { supabase } from "../lib/supabaseClient.js";

export default function DMModal({ currentUser, otherUser, onClose, onError }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchThread(currentUser.id, otherUser.id);
      setMessages(rows);
    } catch (err) {
      onError?.(err.message);
    }
  }, [currentUser.id, otherUser.id, onError]);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));

    const pairKey = [currentUser.id, otherUser.id].sort().join("-");
    const channel = supabase
      .channel(`dm-${pairKey}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => refresh())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [refresh, currentUser.id, otherUser.id]);

  async function submit() {
    if (!text.trim()) return;
    const body = text.trim();
    setText("");
    try {
      await sendMessage({ senderId: currentUser.id, recipientId: otherUser.id, text: body });
      refresh();
    } catch (err) {
      onError?.(err.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-[380px] h-[520px] rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Avatar initials={otherUser.initials} color={otherUser.color} size={32} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {otherUser.name}
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-secondary)" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {loading ? (
            <div className="text-xs text-center mt-4" style={{ color: "var(--text-secondary)" }}>
              Loading...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-xs text-center mt-4" style={{ color: "var(--text-secondary)" }}>
              No messages yet. Say hi!
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="max-w-[75%] px-3 py-2 rounded-xl text-xs leading-relaxed"
                style={{
                  alignSelf: m.sender_id === currentUser.id ? "flex-end" : "flex-start",
                  background: m.sender_id === currentUser.id ? "var(--accent)" : "var(--bg)",
                  color: m.sender_id === currentUser.id ? "#050505" : "var(--text)",
                }}
              >
                {m.text}
              </div>
            ))
          )}
        </div>

        <div className="p-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Message..."
            className="flex-1 h-9 rounded-full px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)" }}
          />
          <button
            onClick={submit}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--accent)", color: "#050505" }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
