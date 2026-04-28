const { createClient } = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  const error = new Error("Supabase environment variables are not configured");
  error.statusCode = 500;

  supabase = {
    from() {
      throw error;
    },
  };
}

module.exports = supabase;
