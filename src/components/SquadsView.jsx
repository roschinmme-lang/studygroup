import React, { useState } from "react";
import { ArrowLeft, Users, Plus } from "lucide-react";
import FeedView from "./FeedView.jsx";

function SquadRow({ squad, onJoin, onLeave, onOpen }) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl mb-2"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <button onClick={() => onOpen(squad.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "var(--accent)" }}>
          <Users size={18} color="#050505" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {squad.name}
          </div>
          <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
            {squad.memberCount} member{squad.memberCount === 1 ? "" : "s"}
            {squad.description ? ` \u00b7 ${squad.description}` : ""}
          </div>
        </div>
      </button>
      {squad.joined ? (
        <button
          onClick={() => onLeave(squad)}
          className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
          style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          Leave
        </button>
      ) : (
        <button
          onClick={() => onJoin(squad)}
          className="text-xs font-semibold px-3 py-1.5 rounded-full shrink-0"
          style={{ background: "var(--accent)", color: "#050505" }}
        >
          Join
        </button>
      )}
    </div>
  );
}

export default function SquadsView({
  squads,
  onJoin,
  onLeave,
  onCreate,
  selectedSquadId,
  setSelectedSquadId,
  posts,
  onReport,
  onPost,
  onAddComment,
  onToggleLike,
  onError,
  activeUser,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedSquad = squads.find((s) => s.id === selectedSquadId);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate({ name, description });
      setName("");
      setDescription("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  if (selectedSquadId && selectedSquad) {
    const squadPosts = posts.filter((p) => p.squad === selectedSquad.name);
    return (
      <div className="max-w-2xl mx-auto w-full py-5 px-4">
        <button
          onClick={() => setSelectedSquadId(null)}
          className="flex items-center gap-1.5 text-sm font-medium mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={15} /> All squads
        </button>
        <FeedView
          posts={squadPosts}
          onReport={onReport}
          onPost={(text, imageUrl) => onPost(text, imageUrl, selectedSquad.name)}
          onAddComment={onAddComment}
          onToggleLike={onToggleLike}
          onError={onError}
          activeUser={activeUser}
          heading={selectedSquad.name}
          subheading={`${selectedSquad.memberCount} member${selectedSquad.memberCount === 1 ? "" : "s"}${selectedSquad.description ? " \u00b7 " + selectedSquad.description : ""}`}
          showComposer={selectedSquad.joined}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full py-5 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>
            Study Squads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Join a squad to post and see its feed
          </p>
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-full shrink-0"
          style={{ background: "var(--accent)", color: "#050505" }}
        >
          <Plus size={15} /> New squad
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl p-4 mb-4 flex flex-col gap-2"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Squad name"
            required
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="h-9 rounded-lg text-sm font-semibold self-start px-4"
            style={{ background: "var(--accent)", color: "#050505", opacity: creating ? 0.6 : 1 }}
          >
            {creating ? "Creating..." : "Create squad"}
          </button>
        </form>
      )}

      {squads.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>
          No squads yet. Be the first to create one.
        </div>
      ) : (
        squads.map((s) => (
          <SquadRow key={s.id} squad={s} onJoin={onJoin} onLeave={onLeave} onOpen={setSelectedSquadId} />
        ))
      )}
    </div>
  );
}
