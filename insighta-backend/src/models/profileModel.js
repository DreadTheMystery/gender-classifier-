const supabase = require("../database/supabase");

function getAgeGroup(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

async function findByName(name) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data;
}

async function createProfile(id, name, data) {
  const age_group = getAgeGroup(data.age);
  const created_at = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert([
      {
        id,
        name,
        gender: data.gender,
        gender_probability: data.gender_probability,
        age: data.age,
        age_group,
        country_id: data.country_id,
        country_name: data.country_name,
        country_probability: data.country_probability,
        created_at,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return inserted;
}

function applyFilters(query, filters) {
  let result = query;

  if (filters.gender) {
    result = result.eq("gender", filters.gender);
  }

  if (filters.country_id) {
    result = result.eq("country_id", filters.country_id);
  }

  if (filters.age_group) {
    result = result.eq("age_group", filters.age_group);
  }

  if (filters.min_age !== undefined) {
    result = result.gte("age", filters.min_age);
  }

  if (filters.max_age !== undefined) {
    result = result.lte("age", filters.max_age);
  }

  if (filters.min_gender_probability !== undefined) {
    result = result.gte("gender_probability", filters.min_gender_probability);
  }

  if (filters.min_country_probability !== undefined) {
    result = result.gte("country_probability", filters.min_country_probability);
  }

  return result;
}

async function listProfiles(filters, options) {
  let query = supabase.from("profiles").select("*", { count: "exact" });
  query = applyFilters(query, filters);

  if (options.sort_by) {
    query = query.order(options.sort_by, {
      ascending: options.order !== "desc",
    });
  }

  if (options.paginate !== false) {
    const from = (options.page - 1) * options.limit;
    const to = from + options.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

async function exportProfiles(filters, options) {
  const result = await listProfiles(filters, {
    ...options,
    paginate: false,
  });

  return result.data;
}

async function deleteProfile(id) {
  const { data, error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return false;

  return Array.isArray(data) && data.length > 0;
}

module.exports = {
  getAgeGroup,
  findByName,
  findById,
  createProfile,
  listProfiles,
  exportProfiles,
  deleteProfile,
};
