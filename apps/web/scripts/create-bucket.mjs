import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { error } = await supabase.storage.createBucket("imagenes", {
  public: true,
});

if (error && !/exist/i.test(error.message)) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log("✅ Bucket 'imagenes' listo (público)");
