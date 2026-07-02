export type Rol = "admin" | "editor";

type ConMetadata = { user_metadata?: Record<string, unknown> | null } | null;

/**
 * Rol del usuario. Regla: es "admin" salvo que esté marcado explícitamente como
 * "editor". Así los usuarios previos (sin metadata) no quedan bloqueados, y los
 * editores que se crean a propósito sí quedan limitados.
 */
export function rolDeUsuario(user: ConMetadata): Rol {
  return user?.user_metadata?.rol === "editor" ? "editor" : "admin";
}

export function esAdmin(user: ConMetadata): boolean {
  return rolDeUsuario(user) === "admin";
}
