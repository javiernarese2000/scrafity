"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

export type Rol = "admin" | "editor";

export type UsuarioRow = {
  id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
  creado: string;
  ultimoAcceso: string | null;
};

export async function listarUsuarios(): Promise<UsuarioRow[]> {
  const { data, error } = await createAdminClient().auth.admin.listUsers({
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
        // "editor" solo si está explícito; el resto es admin (evita lockout).
        rol: (m.rol === "editor" ? "editor" : "admin") as Rol,
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
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("El email es obligatorio.");
  if (input.password.length < 8)
    throw new Error("La contraseña debe tener al menos 8 caracteres.");

  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true, // interno: sin verificación por mail, entra directo
    user_metadata: { nombre: input.nombre?.trim() || null, rol: input.rol },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

/** Cambia nombre / rol (no la contraseña). */
export async function actualizarUsuario(
  id: string,
  input: { nombre?: string; rol: Rol },
): Promise<void> {
  const { error } = await createAdminClient().auth.admin.updateUserById(id, {
    user_metadata: { nombre: input.nombre?.trim() || null, rol: input.rol },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}

export async function eliminarUsuario(id: string): Promise<void> {
  const { error } = await createAdminClient().auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
  revalidatePath("/usuarios");
}
