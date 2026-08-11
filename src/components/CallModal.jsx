import React, { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { Avatar } from "./Shared.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { setOfferSdp, acceptCall, declineCall, endCall, fetchCall } from "../lib/callsApi.js";

// Free public STUN servers only — no TURN relay. Works for most direct
// connections (same wifi, favorable home NATs); may fail to connect on
// some restrictive networks (school/office firewalls, some mobile
// carriers) that require a TURN relay, which needs a paid service.
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
const RINGING_TIMEOUT_MS = 30000;

export default function CallModal({ call, currentUser, otherUser, isCaller, onClose, onError }) {
  const [phase, setPhaseState] = useState(isCaller ? "connecting" : "incoming");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Mirrors `phase` for use inside callbacks/timeouts, which would
  // otherwise close over a stale value from when the effect first ran.
  const phaseRef = useRef(phase);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceChannelRef = useRef(null);
  const iceBufferRef = useRef([]);
  const endedRef = useRef(false);

  const setPhase = useCallback((p) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (iceChannelRef.current) {
      supabase.removeChannel(iceChannelRef.current);
      iceChannelRef.current = null;
    }
  }, []);

  const finish = useCallback(
    (finalPhase) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase(finalPhase);
      cleanup();
      setTimeout(onClose, finalPhase === "ended" ? 1000 : 0);
    },
    [cleanup, onClose, setPhase]
  );

  const startConnection = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setPhase("active");
        if (["failed", "closed"].includes(pc.connectionState) && !endedRef.current) finish("ended");
      };

      const channel = supabase.channel(`call-${call.id}`);
      channel.on("broadcast", { event: "ice" }, ({ payload }) => {
        if (payload?.from !== currentUser.id && payload?.candidate) {
          pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
        }
      });
      await channel.subscribe();
      iceChannelRef.current = channel;

      // The caller might generate candidates before the callee has even
      // subscribed to this channel (they're still looking at the
      // incoming-call prompt). Broadcast messages aren't replayed to
      // late subscribers, so the caller buffers its own candidates and
      // re-sends them once it knows the callee has joined (see the
      // "accepted" handler below).
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const msg = { from: currentUser.id, candidate: event.candidate.toJSON() };
        if (isCaller) iceBufferRef.current.push(msg);
        channel.send({ type: "broadcast", event: "ice", payload: msg });
      };

      return pc;
    } catch (err) {
      onError?.(
        err.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings to make calls."
          : err.message
      );
      finish("ended");
      return null;
    }
  }, [call.id, currentUser.id, isCaller, onError, finish, setPhase]);

  const handleHangup = useCallback(async () => {
    try {
      await endCall(call.id);
    } catch (err) {
      onError?.(err.message);
    }
    finish("ended");
  }, [call.id, finish, onError]);

  const handleDecline = useCallback(async () => {
    try {
      await declineCall(call.id);
    } catch (err) {
      onError?.(err.message);
    }
    finish("ended");
  }, [call.id, finish, onError]);

  // Everyone watches the call row for it being ended/declined elsewhere;
  // the caller additionally watches for the callee's answer.
  useEffect(() => {
    const sub = supabase
      .channel(`call-row-${call.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${call.id}` },
        async ({ new: row }) => {
          if (row.status === "declined" || row.status === "ended") {
            finish("ended");
            return;
          }
          if (isCaller && row.status === "accepted" && row.answer_sdp && pcRef.current && !pcRef.current.currentRemoteDescription) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(row.answer_sdp));
            iceBufferRef.current.forEach((msg) => iceChannelRef.current?.send({ type: "broadcast", event: "ice", payload: msg }));
            iceBufferRef.current = [];
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id]);

  // Caller starts connecting the moment the modal opens.
  useEffect(() => {
    if (!isCaller) return;
    let cancelled = false;

    (async () => {
      const pc = await startConnection();
      if (!pc || cancelled) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setOfferSdp(call.id, offer);
    })();

    const timeout = setTimeout(() => {
      if (!endedRef.current && phaseRef.current !== "active") {
        endCall(call.id).catch(() => {});
        finish("ended");
      }
    }, RINGING_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAccept() {
    setPhase("connecting");
    const pc = await startConnection();
    if (!pc) return;
    try {
      const fresh = await fetchCall(call.id);
      if (!fresh.offer_sdp) throw new Error("The call ended before it could connect.");
      await pc.setRemoteDescription(new RTCSessionDescription(fresh.offer_sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await acceptCall(call.id, answer);
    } catch (err) {
      onError?.(err.message);
      finish("ended");
    }
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  useEffect(() => {
    if (phase !== "active") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => () => cleanup(), [cleanup]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const statusLabel =
    phase === "incoming"
      ? "Incoming call..."
      : phase === "connecting"
      ? isCaller
        ? "Calling..."
        : "Connecting..."
      : phase === "active"
      ? `${mm}:${ss}`
      : "Call ended";

  return (
    <div className="fixed inset-0 z-[220] flex flex-col items-center justify-center" style={{ background: "rgba(5,5,5,0.94)" }}>
      <audio ref={remoteAudioRef} autoPlay />
      <Avatar initials={otherUser.initials} color={otherUser.color} size={96} />
      <p className="text-white text-lg font-bold mt-4">{otherUser.name}</p>
      <p className="text-white/70 text-sm mt-1">{statusLabel}</p>

      <div className="flex items-center gap-6 mt-10">
        {phase === "incoming" ? (
          <>
            <button
              onClick={handleDecline}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "#E24B4A" }}
              aria-label="Decline"
            >
              <PhoneOff size={22} color="#fff" />
            </button>
            <button
              onClick={handleAccept}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "#3BA55D" }}
              aria-label="Accept"
            >
              <Phone size={22} color="#fff" />
            </button>
          </>
        ) : (
          <>
            {(phase === "connecting" || phase === "active") && (
              <button
                onClick={toggleMute}
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)" }}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff size={18} color="#fff" /> : <Mic size={18} color="#fff" />}
              </button>
            )}
            <button
              onClick={handleHangup}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "#E24B4A" }}
              aria-label="Hang up"
            >
              <PhoneOff size={22} color="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
