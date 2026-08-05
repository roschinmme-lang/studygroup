import React, { useState, useEffect, useCallback, useRef } from "react";
import { Bell, ThumbsUp, MessageSquare, Mail, CheckCheck } from "lucide-react";
import { Avatar } from "./Shared.jsx";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "../lib/notificationsApi.js";
import { supabase } from "../lib/supabaseClient.js";

const ICONS = {
  like: ThumbsUp,
  comment: MessageSquare,
  message: Mail,
};

const LABELS = {
  like: "liked your post",
  comment: "commented on your post",
  message: "sent you a message",
};

export default function NotificationsBell({ currentUser, onOpenDM, onError }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refresh = useCallback(async () => {
    if (!currentUser) return;
    try {
      const rows = await fetchNotifications(currentUser.id);
      setNotifications(rows);
    } catch (err) {
      onError?.(err.message);
    }
  }, [currentUser, onError]);

  useEffect(() => {
    if (!currentUser) return;
    refresh();

    const channel = supabase
      .channel(`notifications-${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${currentUser.id}` },
        () => refresh()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [currentUser, refresh]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleOpenNotification(n) {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } catch (err) {
        onError?.(err.message);
      }
    }
    if (n.type === "message" && n.actor.id) {
      setOpen(false);
      onOpenDM({ id: n.actor.id, name: n.actor.name, initials: n.actor.initials, color: n.actor.color });
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      onError?.(err.message);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--text)" }}
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
            style={{ background: "#E24B4A", color: "#fff" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-11 right-0 w-[320px] max-w-[85vw] rounded-xl shadow-xl overflow-hidden z-40"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div
            className="flex items-center justify-between px-3 py-2.5"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: "var(--accent-strong)" }}
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleOpenNotification(n)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                    style={{ background: n.read ? "transparent" : "rgba(255,208,0,0.08)" }}
                  >
                    <Avatar initials={n.actor.initials} color={n.actor.color} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-snug" style={{ color: "var(--text)" }}>
                        <span className="font-semibold">{n.actor.name}</span> {LABELS[n.type] ?? "sent a notification"}
                      </p>
                      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                        {n.time}
                      </span>
                    </div>
                    <Icon size={13} className="shrink-0 mt-0.5" style={{ color: "var(--text-secondary)" }} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
