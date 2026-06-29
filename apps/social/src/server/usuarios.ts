"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { registrar } from "@/lib/auditoria";

export type Rol = "admin" | "moderador";
export type Area = "noticias" | "redes" | "ambos";

export type UsuarioRow = {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  area: Area;
  creado: string;
  ultimoAcceso: string | null;
};

/** Cliente admin (service role) para la Admin API de Auth. Solo server-side. */
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

function leerArea(v: unknown): Area {
  return v === "noticias" || v === "redes" ? v : "ambos";
}

export async function listarUsuarios(): Promise<UsuarioRow[]> {
  const { data, error } = await admin().auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) throw new Error("No se pudieron listar los usuarios: " + error.message);
  return data.users
    .map((u) => {
      const m = (u.user_metadata ?? {}) as Record<string, unknown>;
      return {
        id: u.id,
        email: u.email ?? "—",
        nombre: typeof m.nombre === "string" ? m.nombre : null,
        rol: (m.rol === "admin" ? "admin" : "moderador") as Rol,
        area: leerArea(m.area),
        creado: u.created_at,
        ultimoAcceso: u.last_sign_in_at ?? null,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function crearUsuario(input: {
  email: string;
  password: string;
  nombre?: string;
  rol: Rol;
  area: Area;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("El email es obligatorio.");
  if (input.password.length < 8)
    throw new Error("La contraseña debe tener al menos 8 caracteres.");

  const { error } = await admin().auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true, // interno: sin verificación por mail, entra directo
    user_metadata: {
      nombre: input.nombre?.trim() || null,
      rol: input.rol,
      area: input.area,
    },
  });
  if (error) throw new Error(error.message);
  await registrar({
    accion: "usuario.crear",
    entidad: "usuario",
    resumen: `Creó el usuario ${email} (${input.rol}, ${input.area})`,
  });
  revalidatePath("/usuarios");
}

/** Cambia nombre / rol / área (no la contraseña). */
export async function actualizarUsuario(
  id: string,
  input: { nombre?: string; rol: Rol; area: Area },
): Promise<void> {
  const { data: prev } = await admin().auth.admin.getUserById(id);
  const { error } = await admin().auth.admin.updateUserById(id, {
    user_metadata: {
      nombre: input.nombre?.trim() || null,
      rol: input.rol,
      area: input.area,
    },
  });
  if (error) throw new Error(error.message);
  await registrar({
    accion: "usuario.editar",
    entidad: "usuario",
    entidadId: id,
    resumen: `Editó al usuario ${prev.user?.email ?? id} → ${input.rol}, ${input.area}`,
  });
  revalidatePath("/usuarios");
}

export async function eliminarUsuario(id: string): Promise<void> {
  const { data: prev } = await admin().auth.admin.getUserById(id);
  const { error } = await admin().auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  await registrar({
    accion: "usuario.eliminar",
    entidad: "usuario",
    entidadId: id,
    resumen: `Eliminó el acceso de ${prev.user?.email ?? id}`,
  });
  revalidatePath("/usuarios");
}
