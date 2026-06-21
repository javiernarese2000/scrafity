// Crea un usuario interno en Supabase Auth (con email confirmado).
// Uso: pnpm --filter @scrapify/web seed:user <email> <password>
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [email, password] = process.argv.slice(2);

if (!url || !key) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env",
  );
  process.exit(1);
}
if (!email || !password) {
  console.error(
    "Uso: pnpm --filter @scrapify/web seed:user <email> <password>",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("✅ Usuario creado:", data.user.email);
