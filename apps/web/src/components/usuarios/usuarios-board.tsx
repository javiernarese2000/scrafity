"use client";

import { Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Modal, inputCls } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  type Rol,
  type UsuarioRow,
} from "@/server/usuarios";

const ROLES: { id: Rol; label: string; desc: string }[] = [
  { id: "admin", label: "Administrador", desc: "Acceso total, incluida la gestión de usuarios." },
  { id: "editor", label: "Editor", desc: "Trabaja las notas del día a día; no gestiona usuarios." },
];

function fmt(d: string | null) {
  if (!d) return "Nunca";
  return new Date(d).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UsuariosBoard({
  usuarios,
  currentUserId,
}: {
  usuarios: UsuarioRow[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const { message, show } = useToast();
  const [pending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UsuarioRow | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("editor");
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<UsuarioRow | null>(null);

  function abrirNuevo() {
    setEditing(null);
    setEmail("");
    setPassword("");
    setNombre("");
    setRol("editor");
    setError(null);
    setOpen(true);
  }

  function abrirEditar(u: UsuarioRow) {
    setEditing(u);
    setEmail(u.email);
    setPassword("");
    setNombre(u.nombre ?? "");
    setRol(u.rol);
    setError(null);
    setOpen(true);
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      try {
        if (editing) {
          await actualizarUsuario(editing.id, { nombre, rol });
        } else {
          await crearUsuario({ email, password, nombre, rol });
        }
        setOpen(false);
        router.refresh();
        show(editing ? "Usuario actualizado" : "Usuario creado");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  function confirmarBorrado() {
    if (!confirmDel) return;
    const id = confirmDel.id;
    setConfirmDel(null);
    startTransition(async () => {
      try {
        await eliminarUsuario(id);
        router.refresh();
        show("Usuario eliminado");
      } catch (e) {
        show(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Usuarios"
        subtitle="Quién puede entrar al panel. Administradores y editores."
        action={
          <Button onClick={abrirNuevo}>
            <Plus className="size-4" />
            Nuevo usuario
          </Button>
        }
      />

      {usuarios.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-line bg-elevated text-muted">
              <UserCog className="size-6" />
            </span>
            <p className="mt-4 font-display text-lg font-medium text-fg">
              No hay usuarios
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => {
            const esYo = u.id === currentUserId;
            return (
              <Card key={u.id}>
                <CardBody className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                    {(u.nombre ?? u.email).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                      {u.nombre || u.email}
                      {esYo && (
                        <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted">
                          vos
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {u.email} · último acceso {fmt(u.ultimoAcceso)}
                    </p>
                  </div>
                  <Badge tone={u.rol === "admin" ? "info" : "neutral"}>
                    {u.rol === "admin" ? "Administrador" : "Editor"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => abrirEditar(u)}
                    aria-label="Editar"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-fg"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(u)}
                    disabled={esYo}
                    title={esYo ? "No podés eliminar tu propio usuario" : "Eliminar"}
                    aria-label="Eliminar"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Alta / edición */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
      >
        <div className="space-y-4">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!editing}
              placeholder="persona@medio.com"
              className={inputCls + (editing ? " opacity-60" : "")}
            />
          </Field>

          {!editing && (
            <Field label="Contraseña (mínimo 8 caracteres)">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Se la pasás a la persona"
                className={inputCls}
              />
            </Field>
          )}

          <Field label="Nombre (opcional)">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Ana Pérez"
              className={inputCls}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-xs text-muted">Rol</p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRol(r.id)}
                  className={
                    "rounded-lg border p-2.5 text-left transition-colors " +
                    (rol === r.id
                      ? "border-accent bg-accent/10"
                      : "border-line hover:bg-elevated")
                  }
                >
                  <span className="block text-sm font-medium text-fg">{r.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pending}>
              {pending ? "Guardando…" : editing ? "Guardar" : "Crear usuario"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de borrado */}
      <Modal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title="Eliminar usuario"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
              <Trash2 className="size-5" />
            </span>
            <div className="min-w-0 text-sm text-fg">
              <p>
                Vas a eliminar el acceso de{" "}
                <span className="font-medium">
                  {confirmDel?.nombre || confirmDel?.email}
                </span>
                .
              </p>
              <p className="mt-1 text-muted">
                No va a poder volver a iniciar sesión. Esta acción no se puede
                deshacer.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setConfirmDel(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmarBorrado} disabled={pending}>
              <Trash2 className="size-4" />
              Eliminar usuario
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
