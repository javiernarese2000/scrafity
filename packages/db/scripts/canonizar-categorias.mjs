// Backfill: canoniza las categorías ya existentes en la base.
// Solo colapsa VARIANTES CONOCIDAS a su término canónico
// (Internacionales → Internacional, Politicas → Política); deja intactas las
// categorías que no estén en la taxonomía (no fuerza nada a "General").
// Uso: pnpm --filter @scrapify/web backfill:categorias
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Falta DATABASE_URL en el .env");
  process.exit(1);
}

// Espejo de la taxonomía de src/lib/categorias.ts (alias → canónico).
const CANON = [
  { nombre: "Política", alias: ["politica", "politicas", "politico", "gobierno", "elecciones", "congreso"] },
  { nombre: "Economía", alias: ["economia", "economias", "finanzas", "mercado", "mercados", "negocios", "dolar", "inflacion"] },
  { nombre: "Sociedad", alias: ["sociedad", "social", "comunidad"] },
  { nombre: "Internacional", alias: ["internacional", "internacionales", "mundo", "exterior", "global"] },
  { nombre: "Nacional", alias: ["nacional", "nacionales", "pais", "interior"] },
  { nombre: "Deportes", alias: ["deporte", "deportes", "deportivo", "futbol", "basquet", "tenis"] },
  { nombre: "Tecnología", alias: ["tecnologia", "tecnologias", "tech", "tecno", "informatica", "gadgets"] },
  { nombre: "Espectáculos", alias: ["espectaculo", "espectaculos", "farandula", "show", "entretenimiento", "famosos"] },
  { nombre: "Policiales", alias: ["policial", "policiales", "sucesos", "inseguridad", "crimen", "narcotrafico"] },
  { nombre: "Cultura", alias: ["cultura", "cultural", "arte", "literatura", "cine", "musica", "teatro", "libros"] },
  { nombre: "Salud", alias: ["salud", "medicina", "bienestar", "nutricion"] },
  { nombre: "Ciencia", alias: ["ciencia", "ciencias", "cientifico", "espacio", "astronomia"] },
  { nombre: "Educación", alias: ["educacion", "educativo", "universidad", "escuela"] },
  { nombre: "Medio Ambiente", alias: ["medio ambiente", "ambiente", "ecologia", "clima", "sustentabilidad"] },
  { nombre: "Turismo", alias: ["turismo", "viajes", "destinos"] },
  { nombre: "Opinión", alias: ["opinion", "opiniones", "editorial", "columna", "analisis"] },
  { nombre: "Religión", alias: ["religion", "religioso", "iglesia", "fe"] },
];

const clave = (s) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");

const INDICE = new Map();
for (const { nombre, alias } of CANON) {
  INDICE.set(clave(nombre), nombre);
  for (const a of alias) INDICE.set(clave(a), nombre);
}

// Devuelve el canónico si es una variante conocida y distinta; si no, null.
function canonOrNull(cat) {
  if (!cat || !cat.trim()) return null;
  const canon = INDICE.get(clave(cat));
  return canon && canon !== cat ? canon : null;
}

const sql = postgres(connectionString, { prepare: false });

async function backfill(tabla) {
  const filas = await sql`SELECT id, categoria FROM ${sql(tabla)} WHERE categoria IS NOT NULL`;
  let cambiados = 0;
  for (const f of filas) {
    const canon = canonOrNull(f.categoria);
    if (canon) {
      await sql`UPDATE ${sql(tabla)} SET categoria = ${canon} WHERE id = ${f.id}`;
      cambiados++;
    }
  }
  console.log(`  ${tabla}: ${cambiados}/${filas.length} canonizadas`);
  return cambiados;
}

try {
  console.log("Canonizando categorías existentes…");
  const a = await backfill("articles");
  const p = await backfill("publications");
  console.log(`✅ Listo. ${a + p} filas actualizadas.`);
} catch (e) {
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
