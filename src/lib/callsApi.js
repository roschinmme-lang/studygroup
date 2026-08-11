import { supabase } from "./supabaseClient.js";

export async function createCall({ callerId, calleeId, callType = "audio" }) {
  const { data, error } = await supabase
    .from("calls")
    .insert({ caller_id: callerId, callee_id: calleeId, call_type: callType, status: "ringing" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setOfferSdp(callId, sdp) {
  const { error } = await supabase.from("calls").update({ offer_sdp: sdp }).eq("id", callId);
  if (error) throw new Error(error.message);
}

export async function acceptCall(callId, answerSdp) {
  const { error } = await supabase
    .from("calls")
    .update({ status: "accepted", answer_sdp: answerSdp })
    .eq("id", callId);
  if (error) throw new Error(error.message);
}

export async function declineCall(callId) {
  const { error } = await supabase.from("calls").update({ status: "declined" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

export async function endCall(callId) {
  const { error } = await supabase.from("calls").update({ status: "ended" }).eq("id", callId);
  if (error) throw new Error(error.message);
}

export async function fetchCall(callId) {
  const { data, error } = await supabase.from("calls").select("*").eq("id", callId).single();
  if (error) throw new Error(error.message);
  return data;
}
