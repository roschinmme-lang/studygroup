import React, { useState, useRef } from "react";
import { ThumbsUp, MessageSquare, Share2, ShieldAlert, Lock, Send, Check, Image as ImageIcon, X } from "lucide-react";
import { Avatar, TierBadge, ReportMenu } from "./Shared.jsx";
import { uploadPostImage, validateImageFile } from "../lib/storageApi.js";

export function Composer({ activeUser, onPost, onError }) {
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const blocked = activeUser.tier === "JHS";

  function handlePickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    try {
      validateImageFile(file);
    } catch (err) {
      onError?.(err.message);
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  async function submit() {
    if (blocked || uploading) return;
    if (!text.trim() && !imageFile) return;

    let imageUrl = null;
    setUploading(true);
    try {
      if (imageFile) {
        imageUrl = await uploadPostImage(imageFile, activeUser.id);
      }
      onPost(text.trim(), imageUrl);
      setText("");
      clearImage();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl p-3 sm:p-4 mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 sm:gap-3">
        <Avatar initials={activeUser.initials} color={activeUser.color} size={34} />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          disabled={blocked}
          placeholder={blocked ? "View-only account \u2014 posting disabled" : "Share something with your squad..."}
          className="flex-1 min-w-0 h-10 rounded-full px-4 text-sm outline-none"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        />
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePickImage} className="hidden" disabled={blocked} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={blocked}
          title={blocked ? "JHS accounts have view-only privileges" : "Add a photo"}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: "var(--bg)",
            color: blocked ? "var(--text-secondary)" : "var(--text)",
            cursor: blocked ? "not-allowed" : "pointer",
          }}
        >
          <ImageIcon size={16} />
        </button>
        <button
          onClick={submit}
          disabled={blocked || uploading || (!text.trim() && !imageFile)}
          title={blocked ? "JHS accounts have view-only privileges" : "Post"}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: blocked || uploading || (!text.trim() && !imageFile) ? "var(--bg)" : "var(--accent)",
            color: blocked || uploading || (!text.trim() && !imageFile) ? "var(--text-secondary)" : "#050505",
            cursor: blocked ? "not-allowed" : "pointer",
          }}
        >
          {blocked ? <Lock size={16} /> : <Send size={15} />}
        </button>
      </div>

      {previewUrl && (
        <div className="relative mt-3 inline-block">
          <img src={previewUrl} alt="Selected upload preview" className="rounded-lg max-h-40 object-cover" />
          <button
            onClick={clearImage}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            aria-label="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {uploading && (
        <div className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          Uploading image...
        </div>
      )}

      {blocked && (
        <div
          className="mt-3 flex items-start gap-2 text-xs font-medium px-3 py-2 rounded-lg"
          style={{ background: "rgba(226,75,74,0.1)", color: "#E24B4A" }}
        >
          <ShieldAlert size={15} className="shrink-0 mt-0.5" />
          Security Exception: JHS accounts have View-Only privileges.
        </div>
      )}
    </div>
  );
}

export default function PostCard({ post, onReport, onAddComment, onToggleLike }) {
  const [quarantined, setQuarantined] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [copied, setCopied] = useState(false);

  const comments = post.commentsList || [];

  const handleReport = (reason) => {
    if (reason.severity === "severe") setQuarantined(true);
    onReport(post, reason, "post");
  };

  function submitComment() {
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText("");
  }

  async function handleShare() {
    const link = `https://studygroup.ph/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // clipboard API unavailable, still show confirmation
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div
      className="rounded-xl mb-4 transition-all duration-500"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        opacity: quarantined ? 0 : 1,
        transform: quarantined ? "scale(0.96)" : "scale(1)",
        maxHeight: quarantined ? 0 : 900,
        marginBottom: quarantined ? 0 : 16,
        padding: quarantined ? "0 16px" : 16,
        overflow: "hidden",
        pointerEvents: quarantined ? "none" : "auto",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar initials={post.authorInitials} color={post.authorColor} size={40} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {post.authorName}
              </span>
              <TierBadge tier={post.authorTier} />
            </div>
            <div className="text-xs flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
              {post.squad} <span>\u00b7</span> {post.time}
            </div>
          </div>
        </div>
        <ReportMenu onReport={handleReport} />
      </div>

      {post.content && (
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text)" }}>
          {post.content}
        </p>
      )}

      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt="Post attachment"
          className="w-full rounded-lg mb-3 object-cover"
          style={{ maxHeight: 420, border: "1px solid var(--border)" }}
          loading="lazy"
        />
      )}

      <div className="flex items-center gap-5 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => onToggleLike(post.id, post.likedByMe)}
          className="flex items-center gap-1.5 text-sm font-medium pt-2 transition-colors"
          style={{ color: post.likedByMe ? "var(--accent-strong)" : "var(--text-secondary)" }}
        >
          <ThumbsUp size={16} fill={post.likedByMe ? "currentColor" : "none"} /> {post.likes}
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium pt-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <MessageSquare size={16} /> {comments.length}
        </button>
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm font-medium pt-2"
          style={{ color: copied ? "var(--accent-strong)" : "var(--text-secondary)" }}
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />} {copied ? "Link copied" : "Share"}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          {comments.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {comments.map((c, i) => (
                <div key={i} className="text-xs">
                  <span className="font-semibold" style={{ color: "var(--text)" }}>
                    {c.author}:{" "}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>{c.text}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment();
              }}
              placeholder="Write a comment..."
              className="flex-1 min-w-0 h-9 rounded-full px-3 text-xs outline-none"
              style={{ background: "var(--bg)", color: "var(--text)" }}
            />
            <button
              onClick={submitComment}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "var(--accent)", color: "#050505" }}
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
