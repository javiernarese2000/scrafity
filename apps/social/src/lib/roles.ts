export type Rol = "admin" | "moderador";

type ConMetadata = { user_metadata?: Record<string, unknown> | null } | null;

/**
 * Rol del usuario. Regla: es "admin" salvo que esté marcado explícitamente como
 * "moderador". Así los usuarios previos (sin metadata) no quedan bloqueados, y
 * los moderadores que se crean a propósito sí quedan limitados.
 */
export function rolDeUsuario(user: ConMetadata): Rol {
  return user?.user_metadata?.rol === "moderador" ? "moderador" : "admin";
}

export function esAdmin(user: ConMetadata): boolean {
  return rolDeUsuario(user) === "admin";
}
