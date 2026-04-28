const supabase = require("../database/supabase");
const { generateUuidV7 } = require("../utils/uuid");

async function findUserById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function findUserByGithubId(githubId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("github_id", String(githubId))
    .maybeSingle();

  if (error) return null;
  return data;
}

async function findOrCreateAdmin() {
  const { data: existing, error: selectError } = await supabase
    .from("users")
    .select("*")
    .eq("role", "admin")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    // eslint-disable-next-line no-console
    console.error("Error querying admin user:", selectError);
    return null;
  }

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const { data: newAdmin, error: insertError } = await supabase
    .from("users")
    .insert([
      {
        id: generateUuidV7(),
        github_id: "admin-seed",
        username: "admin",
        email: "admin@insighta.local",
        avatar_url: null,
        role: "admin",
        is_active: true,
        last_login_at: now,
        created_at: now,
      },
    ])
    .select("*")
    .single();

  if (insertError) {
    // eslint-disable-next-line no-console
    console.error("Error creating admin user:", insertError);
    return existing || null;
  }

  return newAdmin;
}

async function upsertGithubUser(profile) {
  const githubId = String(profile.id);
  const existing = await findUserByGithubId(githubId);
  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await supabase
      .from("users")
      .update({
        username: profile.login,
        email: profile.email,
        avatar_url: profile.avatar_url,
        last_login_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        id: generateUuidV7(),
        github_id: githubId,
        username: profile.login,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: "analyst",
        is_active: true,
        last_login_at: now,
        created_at: now,
      },
    ])
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  findUserById,
  upsertGithubUser,
  findOrCreateAdmin,
};
