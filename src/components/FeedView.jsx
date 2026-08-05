import React from "react";
import PostCard, { Composer } from "./PostCard.jsx";

export default function FeedView({ posts, onReport, onPost, onAddComment, onToggleLike, activeUser, heading, subheading, showComposer }) {
  return (
    <div className="max-w-2xl mx-auto w-full py-5 px-4">
      <div className="mb-4">
        <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>
          {heading}
        </h1>
        {subheading && (
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {subheading}
          </p>
        )}
      </div>
      {showComposer && <Composer activeUser={activeUser} onPost={onPost} />}
      {posts.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>
          No posts here right now.
        </div>
      ) : (
        posts.map((p) => (
          <PostCard key={p.id} post={p} onReport={onReport} onAddComment={onAddComment} onToggleLike={onToggleLike} />
        ))
      )}
    </div>
  );
}
