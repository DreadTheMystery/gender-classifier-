const supabase = require("../database/supabase");
const { generateUuidV7 } = require("../utils/uuid");

async function createSession({ userId, refreshToken, expiresAt }) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("sessions")
    .insert([
      {
        id: generateUuidV7(),
        user_id: userId,
        refresh_token: refreshToken,
        created_at: now,
        expires_at: expiresAt,
        revoked_at: null,
      },
    ])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function findActiveSessionByRefreshToken(refreshToken) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("refresh_token", refreshToken)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function revokeSession(sessionId) {
  const { error } = await supabase
    .from("sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);

  return !error;
}

module.exports = {
  createSession,
  findActiveSessionByRefreshToken,
  revokeSession,
};
