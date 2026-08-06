import React, { useState, useEffect, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  MessageCircle,
  Send,
  ShieldAlert,
  Video as VideoIcon,
  X,
  Plus,
} from "lucide-react";
import { ReportMenu } from "./Shared.jsx";
import { uploadVibeVideo, validateVideoFile } from "../lib/storageApi.js";

function VibeComposer({ activeUser, onPost, onError }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const blocked = activeUser.tier === "JHS";

  function handlePickVideo(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateVideoFile(file);
    } catch (err) {
      onError?.(err.message);
      return;
    }
    setVideoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearVideo() {
    setVideoFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function reset() {
    setTitle("");
    setSubject("");
    clearVideo();
    setOpen(false);
  }

  async function submit() {
    if (blocked || uploading || !title.trim() || !videoFile) return;
    setUploading(true);
    try {
      const videoUrl = await uploadVibeVideo(videoFile, activeUser.id);
      await onPost({ title: title.trim(), subject: subject.trim(), videoUrl });
      reset();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (blocked) {
    return (
      <div
        className="w-full max-w-md mx-auto mb-2 flex items-start gap-2 text-xs font-medium px-3 py-2 rounded-lg"
        style={{ background: "rgba(226,75,74,0.1)", color: "#E24B4A" }}
      >
        <ShieldAlert size={15} className="shrink-0 mt-0.5" />
        Security Exception: JHS accounts have View-Only privileges.
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full mb-2"
        style={{ background: "var(--accent)", color: "#050505" }}
      >
        <Plus size={15} /> Post a Reel
      </button>
    );
  }

  return (
    <div
      className="w-full max-w-md rounded-xl p-4 mb-2"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
          Post a Reel
        </span>
        <button onClick={reset} style={{ color: "var(--text-secondary)" }} aria-label="Cancel">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="h-9 rounded-lg px-3 text-sm outline-none"
          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
        />
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
          className="h-9 rounded-lg px-3 text-sm outline-none"
          style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
        />

        <input ref={fileInputRef} type="file" accept="video/*" onChange={handlePickVideo} className="hidden" />

        {previewUrl ? (
          <div className="relative">
            <video src={previewUrl} controls className="w-full rounded-lg max-h-64" style={{ background: "#000" }} />
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
              aria-label="Remove video"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-24 rounded-lg flex flex-col items-center justify-center gap-1.5 text-xs font-medium"
            style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px dashed var(--border)" }}
          >
            <VideoIcon size={18} />
            Choose a video file (under 50MB)
          </button>
        )}

        {uploading && (
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Uploading...
          </div>
        )}

        <button
          onClick={submit}
          disabled={uploading || !title.trim() || !videoFile}
          className="h-9 rounded-lg text-sm font-semibold mt-1 transition-opacity"
          style={{
            background: "var(--accent)",
            color: "#050505",
            opacity: uploading || !title.trim() || !videoFile ? 0.6 : 1,
          }}
        >
          {uploading ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}

export default function VibesView({ vibes, onReport, onPost, onAddComment, activeUser, index, setIndex, onError }) {
  const [qaInput, setQaInput] = useState("");

  const clamped = Math.min(index, Math.max(vibes.length - 1, 0));
  const vibe = vibes[clamped];

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(vibes.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vibes.length, setIndex]);

  function submitQuestion() {
    if (!qaInput.trim() || !vibe) return;
    onAddComment(vibe.id, qaInput.trim());
    setQaInput("");
  }

  return (
    <div className="flex-1 flex flex-col items-center py-6 px-4 overflow-y-auto">
      <VibeComposer activeUser={activeUser} onPost={onPost} onError={onError} />

      {!vibe ? (
        <div className="flex-1 flex items-center justify-center text-sm text-center max-w-xs" style={{ color: "var(--text-secondary)" }}>
          No Vibes yet. Be the first to post a Reel!
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row justify-center items-center lg:items-start gap-5 w-full">
          {/* Video player */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div
              className="relative rounded-2xl overflow-hidden shrink-0"
              style={{ width: 260, height: Math.round((260 * 16) / 9), background: "#000", border: "1px solid var(--border)" }}
            >
              <video key={vibe.id} src={vibe.videoUrl} controls className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3">
                <div className="rounded-full backdrop-blur bg-black/30">
                  <ReportMenu onReport={(reason) => onReport(vibe, reason, "vibe")} />
                </div>
              </div>
            </div>

            <div className="text-center max-w-[260px]">
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {vibe.title}
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {vibe.subject ? `${vibe.subject} \u2022 ` : ""}
                {vibe.authorName} \u00b7 {vibe.time}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <ChevronUp size={16} />
              </button>
              <span>
                {clamped + 1} / {vibes.length} \u00b7 \u2191 \u2193 to navigate
              </span>
              <button
                onClick={() => setIndex((i) => Math.min(vibes.length - 1, i + 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* Q&A panel */}
          <div
            className="w-[92vw] max-w-[340px] lg:w-[340px] shrink-0 h-[360px] rounded-2xl flex flex-col overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <MessageCircle size={14} style={{ color: "var(--accent-strong)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                Q&amp;A thread
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {vibe.comments.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  No questions yet \u2014 ask the first one.
                </p>
              ) : (
                vibe.comments.map((item, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-semibold" style={{ color: "var(--text)" }}>
                      {item.author}:{" "}
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>{item.text}</span>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <input
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitQuestion();
                }}
                placeholder="Ask a question..."
                className="flex-1 h-8 rounded-full px-3 text-xs outline-none"
                style={{ background: "var(--bg)", color: "var(--text)" }}
              />
              <button
                onClick={submitQuestion}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--accent)", color: "#050505" }}
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
