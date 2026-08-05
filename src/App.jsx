import React, { useState, useEffect, useCallback } from "react";
import TopNav from "./components/TopNav.jsx";
import LeftSidebar from "./components/LeftSidebar.jsx";
import RightSidebar from "./components/RightSidebar.jsx";
import FeedView from "./components/FeedView.jsx";
import VibesView from "./components/VibesView.jsx";
import SquadsView from "./components/SquadsView.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import { Toast } from "./components/Shared.jsx";
import { VIBES, DEVICE_STRING } from "./data/mockData.js";
import { useAuth } from "./hooks/useAuth.js";
import { supabase } from "./lib/supabaseClient.js";
import { fetchPosts, createPost, addComment, toggleLike, quarantinePost, fetchModLog, insertModLogEntry } from "./lib/postsApi.js";
import { fetchSquads, joinSquad, leaveSquad, createSquad } from "./lib/squadsApi.js";

export default function App() {
  const { user, signup, login, logout, loading: authLoading } = useAuth();

  const [theme, setTheme] = useState("light");
  const [activeView, setActiveView] = useState("feed");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [vibeIndex, setVibeIndex] = useState(0);
  const [modLog, setModLog] = useState([]);
  const [squads, setSquads] = useState([]);
  const [selectedSquadId, setSelectedSquadId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => setToast(msg), []);

  const refreshPosts = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchPosts(user.id);
      setPosts(rows);
    } catch (err) {
      setToast(err.message);
    }
  }, [user]);

  const refreshModLog = useCallback(async () => {
    try {
      const rows = await fetchModLog();
      setModLog(rows);
    } catch (err) {
      setToast(err.message);
    }
  }, []);

  const refreshSquads = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchSquads(user.id);
      setSquads(rows);
    } catch (err) {
      setToast(err.message);
    }
  }, [user]);

  // Initial load once a user is signed in, plus realtime subscriptions so
  // the feed, squads, and moderation log update live across tabs/users.
  useEffect(() => {
    if (!user) {
      setPosts([]);
      setModLog([]);
      setSquads([]);
      return;
    }

    setPostsLoading(true);
    Promise.all([refreshPosts(), refreshModLog(), refreshSquads()]).finally(() => setPostsLoading(false));

    const channel = supabase
      .channel("public:studygroup")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refreshPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => refreshPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => refreshPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "mod_log" }, () => refreshModLog())
      .on("postgres_changes", { event: "*", schema: "public", table: "squads" }, () => refreshSquads())
      .on("postgres_changes", { event: "*", schema: "public", table: "squad_members" }, () => refreshSquads())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshPosts, refreshModLog, refreshSquads]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleReport = useCallback(
    async (target, reason, sourceType) => {
      if (reason.severity === "severe") {
        try {
          await insertModLogEntry({
            reasonLabel: reason.label,
            targetSnippet: (target.content || "").slice(0, 60) + ((target.content || "").length > 60 ? "..." : ""),
            device: DEVICE_STRING,
            lockout: "Content permanently quarantined \u2022 kill-switch engaged",
          });
          if (sourceType === "post") {
            await quarantinePost(target.id);
            refreshPosts();
          }
          setToast("Post quarantined. Moderation notified instantly.");
        } catch (err) {
          setToast(err.message);
        }
      } else {
        setToast("Report submitted for review.");
      }
    },
    [refreshPosts]
  );

  const handlePost = useCallback(
    async (text, squadName = "Your feed") => {
      if (!user || user.tier === "JHS") return;
      try {
        await createPost({ authorId: user.id, content: text, squad: squadName });
        setToast("Posted.");
        refreshPosts();
      } catch (err) {
        setToast(err.message);
      }
    },
    [user, refreshPosts]
  );

  const handleAddComment = useCallback(
    async (postId, text) => {
      if (!user) return;
      try {
        await addComment({ postId, authorId: user.id, text });
        refreshPosts();
      } catch (err) {
        setToast(err.message);
      }
    },
    [user, refreshPosts]
  );

  const handleToggleLike = useCallback(
    async (postId, currentlyLiked) => {
      if (!user) return;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likedByMe: !currentlyLiked, likes: p.likes + (currentlyLiked ? -1 : 1) } : p
        )
      );
      try {
        await toggleLike({ postId, userId: user.id, currentlyLiked });
      } catch (err) {
        setToast(err.message);
        refreshPosts();
      }
    },
    [user, refreshPosts]
  );

  const handleJoinSquad = useCallback(
    async (squad) => {
      if (!user) return;
      try {
        await joinSquad(squad.id, user.id);
        refreshSquads();
      } catch (err) {
        setToast(err.message);
      }
    },
    [user, refreshSquads]
  );

  const handleLeaveSquad = useCallback(
    async (squad) => {
      if (!user) return;
      try {
        await leaveSquad(squad.id, user.id);
        refreshSquads();
      } catch (err) {
        setToast(err.message);
      }
    },
    [user, refreshSquads]
  );

  const handleCreateSquad = useCallback(
    async ({ name, description }) => {
      if (!user) return;
      try {
        await createSquad({ name, description, creatorId: user.id });
        setToast("Squad created.");
        refreshSquads();
      } catch (err) {
        setToast(err.message);
        throw err;
      }
    },
    [user, refreshSquads]
  );

  const handleSelectSquad = useCallback((squadId) => {
    setSelectedSquadId(squadId);
    setActiveView("squads");
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <div style={{ height: "100vh", width: "100%", overflow: "hidden" }} data-theme={theme}>
      <div style={{ background: "var(--bg)", height: "100%", overflow: "hidden", position: "relative" }}>
        {authLoading ? (
          <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading...
          </div>
        ) : !user ? (
          <AuthScreen signup={signup} login={login} theme={theme} toggleTheme={toggleTheme} />
        ) : (
          <>
            <TopNav
              theme={theme}
              toggleTheme={toggleTheme}
              activeView={activeView}
              setActiveView={(v) => {
                setSelectedSquadId(null);
                setActiveView(v);
              }}
              activeUser={user}
              onLogout={logout}
              userMenuOpen={userMenuOpen}
              setUserMenuOpen={setUserMenuOpen}
            />

            <div className="flex" style={{ height: "calc(100% - 56px)", marginTop: 56, overflow: "hidden" }}>
              <LeftSidebar
                activeView={activeView}
                setActiveView={(v) => {
                  setSelectedSquadId(null);
                  setActiveView(v);
                }}
                activeUser={user}
                squads={squads}
                onSelectSquad={handleSelectSquad}
              />

              <main className="flex-1 h-full overflow-y-auto overflow-x-hidden">
                {postsLoading ? (
                  <div className="text-sm text-center py-10" style={{ color: "var(--text-secondary)" }}>
                    Loading feed...
                  </div>
                ) : (
                  <>
                    {activeView === "feed" && (
                      <FeedView
                        posts={posts}
                        onReport={handleReport}
                        onPost={handlePost}
                        onAddComment={handleAddComment}
                        onToggleLike={handleToggleLike}
                        activeUser={user}
                        heading="Vibes feed home"
                        subheading="Posts from your squads and major"
                        showComposer
                      />
                    )}
                    {activeView === "major" && (
                      <FeedView
                        posts={posts.filter((p) => p.authorTier === "UNI")}
                        onReport={handleReport}
                        onPost={handlePost}
                        onAddComment={handleAddComment}
                        onToggleLike={handleToggleLike}
                        activeUser={user}
                        heading="My Major \u2022 BSIT"
                        subheading="Posts and threads from students in your program"
                        showComposer={false}
                      />
                    )}
                    {activeView === "squads" && (
                      <SquadsView
                        squads={squads}
                        onJoin={handleJoinSquad}
                        onLeave={handleLeaveSquad}
                        onCreate={handleCreateSquad}
                        selectedSquadId={selectedSquadId}
                        setSelectedSquadId={setSelectedSquadId}
                        posts={posts}
                        onReport={handleReport}
                        onPost={handlePost}
                        onAddComment={handleAddComment}
                        onToggleLike={handleToggleLike}
                        activeUser={user}
                      />
                    )}
                    {activeView === "vibes" && (
                      <VibesView vibes={VIBES} onReport={handleReport} activeUser={user} index={vibeIndex} setIndex={setVibeIndex} />
                    )}
                  </>
                )}
              </main>

              <RightSidebar modLog={modLog} currentUser={user} onToast={showToast} />
            </div>
          </>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}
