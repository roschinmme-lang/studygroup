import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Play,
  MessageCircle,
  Send,
  Plus,
  X,
  Video as VideoIcon,
  Lock,
} from "lucide-react";
import { ReportMenu } from "./Shared.jsx";
import { uploadVibeVideo, validateVideoFile } from "../lib/storageApi.js";

/* ---------------------------------------------------------------- */

function QAOverlay({ vibe, onAddComment, onClose }) {
  const [qaInput, setQaInput] = useState("");

  function submit() {
    if (!qaInput.trim()) return;
    onAddComment(vibe.id, qaInput.trim());
    setQaInput("");
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[380px] max-h-[75vh] sm:max-h-[520px] h-[75vh] sm:h-[520px] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <MessageCircle size={15} style={{ color: "var(--accent-strong)" }} />
            <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Q&amp;A thread
            </span>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-secondary)" }} aria-label="Close">
            <X size={18} />
          </button>
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
              if (e.key === "Enter") submit();
            }}
            placeholder="Ask a question..."
            className="flex-1 min-w-0 h-9 rounded-full px-3 text-sm outline-none"
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

/* ---------------------------------------------------------------- */

function ComposerModal({ activeUser, onPost, onError, onClose }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [videoFile, setVideoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  async function submit() {
    if (uploading || !title.trim() || !videoFile) return;
    setUploading(true);
    try {
      const videoUrl = await uploadVibeVideo(videoFile, activeUser.id);
      await onPost({ title: title.trim(), subject: subject.trim(), videoUrl });
      onClose();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[420px] max-h-[85vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
            Post a Reel
          </span>
          <button onClick={onClose} style={{ color: "var(--text-secondary)" }} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-2 overflow-y-auto">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional)"
            className="h-10 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />

          <input ref={fileInputRef} type="file" accept="video/*" onChange={handlePickVideo} className="hidden" />

          {previewUrl ? (
            <div className="relative">
              <video src={previewUrl} controls playsInline className="w-full rounded-lg max-h-64" style={{ background: "#000" }} />
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
              className="h-28 rounded-lg flex flex-col items-center justify-center gap-1.5 text-xs font-medium"
              style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px dashed var(--border)" }}
            >
              <VideoIcon size={20} />
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
            className="h-10 rounded-lg text-sm font-semibold mt-1 transition-opacity"
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
    </div>
  );
}

/* ---------------------------------------------------------------- */

function VibeSlide({ vibe, active, onToggleMute, onReport, onOpenQA }) {
  const videoRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (active) {
      setPaused(false);
      v.currentTime = 0;
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  }, [active, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
  }, [muted]);

  function handleTap() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 450);
  }

  return (
    <div className="h-full w-full shrink-0 snap-start snap-always flex items-center justify-center relative" style={{ background: "#000" }}>
      <div className="relative h-full w-full sm:max-w-[420px] sm:rounded-2xl overflow-hidden" style={{ background: "#000" }}>
        <video
          ref={videoRef}
          src={vibe.videoUrl}
          loop
          muted={muted}
          playsInline
          onClick={handleTap}
          className="w-full h-full object-cover"
        />

        {showIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
              <Play size={26} color="#fff" fill={paused ? "none" : "#fff"} />
            </div>
          </div>
        )}

        {/* Bottom caption overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 pb-6"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}
        >
          <p className="text-white text-sm font-semibold">{vibe.title}</p>
          <p className="text-white/80 text-xs mt-0.5">
            {vibe.subject ? `${vibe.subject} \u2022 ` : ""}
            {vibe.authorName} \u00b7 {vibe.time}
          </p>
        </div>

        {/* Right-side action rail */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
          <button
            onClick={onToggleMute}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={18} color="#fff" /> : <Volume2 size={18} color="#fff" />}
          </button>
          <button
            onClick={() => onOpenQA(vibe)}
            className="flex flex-col items-center gap-1"
            aria-label="Open Q&A"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
              <MessageCircle size={18} color="#fff" />
            </div>
            <span className="text-[10px] text-white font-semibold">{vibe.comments.length}</span>
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
            <ReportMenu onReport={(reason) => onReport(vibe, reason, "vibe")} align="right" iconColor="#fff" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export default function VibesView({ vibes, onReport, onPost, onAddComment, activeUser, index, setIndex, onError }) {
  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const [muted, setMuted] = useState(true);
  const [qaTarget, setQaTarget] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const blocked = activeUser.tier === "JHS";

  // Keep the scroll position in sync with `index`, whatever changed it
  // (keyboard nav, or the parent resetting it after a quarantine).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const target = index * container.clientHeight;
    if (Math.abs(container.scrollTop - target) > 4) {
      container.scrollTo({ top: target, behavior: "smooth" });
    }
  }, [index, vibes.length]);

  // IntersectionObserver drives `index` when the user scrolls/swipes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const i = Number(entry.target.dataset.index);
            setIndex(i);
          }
        });
      },
      { root: container, threshold: [0.6] }
    );

    slideRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [vibes.length, setIndex]);

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

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const handleFabClick = () => {
    if (blocked) {
      onError?.("Security Exception: JHS accounts have View-Only privileges.");
      return;
    }
    setComposerOpen(true);
  };

  return (
    <div className="h-full relative overflow-hidden" style={{ background: "#000" }}>
      {vibes.length === 0 ? (
        <div className="h-full w-full flex items-center justify-center text-sm text-center px-6" style={{ color: "rgba(255,255,255,0.7)" }}>
          No Vibes yet. Be the first to post a Reel!
        </div>
      ) : (
        <div
          ref={containerRef}
          className="no-scrollbar h-full w-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {vibes.map((vibe, i) => (
            <div key={vibe.id} ref={(el) => (slideRefs.current[i] = el)} data-index={i} className="h-full w-full">
              <VibeSlide
                vibe={vibe}
                active={i === index}
                muted={muted}
                onToggleMute={toggleMute}
                onReport={onReport}
                onOpenQA={setQaTarget}
              />
            </div>
          ))}
        </div>
      )}

      {/* Floating post button */}
      <button
        onClick={handleFabClick}
        className="absolute bottom-6 right-4 sm:right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-20"
        style={{ background: blocked ? "var(--surface)" : "var(--accent)", border: blocked ? "1px solid var(--border)" : "none" }}
        aria-label="Post a Reel"
      >
        {blocked ? <Lock size={20} style={{ color: "var(--text-secondary)" }} /> : <Plus size={24} color="#050505" />}
      </button>

      {qaTarget && (
        <QAOverlay
          vibe={vibes.find((v) => v.id === qaTarget.id) || qaTarget}
          onAddComment={onAddComment}
          onClose={() => setQaTarget(null)}
        />
      )}

      {composerOpen && (
        <ComposerModal activeUser={activeUser} onPost={onPost} onError={onError} onClose={() => setComposerOpen(false)} />
      )}
    </div>
  );
}
