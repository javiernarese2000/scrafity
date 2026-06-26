"use client";

import { Badge } from "@scrapify/ui/badge";
import { Button } from "@scrapify/ui/button";
import { Card, CardBody } from "@scrapify/ui/card";
import { Field, Modal, inputCls } from "@scrapify/ui/modal";
import { PageHeader } from "@scrapify/ui/page-header";
import { Toast, useToast } from "@scrapify/ui/toast";
import { Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  actualizarCliente,
  crearCliente,
  eliminarCliente,
  toggleClienteActivo,
  type ClienteRow,
} from "@/server/clientes";

export function ClientesBoard({ inicial }: { inicial: ClienteRow[] }) {
  const router = useRouter();
  const { message, show } = useToast();
  const [pending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteRow | null>(null);
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  function abrirNuevo() {
    setEditing(null);
    setNombre("");
    setNotas("");
    setError(null);
    setOpen(true);
  }

  function abrirEditar(c: ClienteRow) {
    setEditing(c);
    setNombre(c.nombre);
    setNotas(c.notas ?? "");
    setError(null);
    setOpen(true);
  }

  function guardar() {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    startTransition(async () => {
      try {
        if (editing) await actualizarCliente(editing.id, nombre, notas);
        else await crearCliente(nombre, notas);
        setOpen(false);
        router.refresh();
        show(editing ? "Cliente actualizado" : "Cliente creado");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  function toggle(c: ClienteRow) {
    startTransition(async () => {
      await toggleClienteActivo(c.id, !c.activo);
      router.refresh();
      show(c.activo ? "Cliente pausado" : "Cliente activado");
    });
  }

  function borrar(c: ClienteRow) {
    if (
      !window.confirm(
        `¿Eliminar el cliente "${c.nombre}"? Sus destinos quedan sin asignar.`,
      )
    )
      return;
    startTransition(async () => {
      await eliminarCliente(c.id);
      router.refresh();
      show("Cliente eliminado");
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Clientes"
        subtitle="Cada cliente agrupa sus cuentas de redes (y, si tiene, sus destinos de noticias)."
        action={
          <Button onClick={abrirNuevo}>
            <Plus className="size-4" />
            Nuevo cliente
          </Button>
        }
      />

      {inicial.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-line bg-elevated text-muted">
              <Users className="size-6" />
            </span>
            <p className="mt-4 font-display text-lg font-medium text-fg">
              Todavía no hay clientes
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              Creá el primero para empezar a conectarle cuentas de redes.
            </p>
            <Button className="mt-5" onClick={abrirNuevo}>
              <Plus className="size-4" />
              Nuevo cliente
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inicial.map((c) => (
            <Card key={c.id} className={c.activo ? "" : "opacity-60"}>
              <CardBody className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/15 font-display text-base font-semibold text-accent">
                    {c.nombre.charAt(0).toUpperCase()}
                  </span>
                  <Badge tone={c.activo ? "success" : "neutral"}>
                    {c.activo ? "Activo" : "Pausado"}
                  </Badge>
                </div>

                <p className="mt-3 font-display text-lg font-medium text-fg">
                  {c.nombre}
                </p>
                {c.notas && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{c.notas}</p>
                )}

                <p className="mt-3 text-xs text-muted">
                  {c.destinos} {c.destinos === 1 ? "destino" : "destinos"}
                </p>

                <div className="mt-4 flex items-center gap-1 border-t border-line/70 pt-3">
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(c)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggle(c)}>
                    <Power className="size-3.5" />
                    {c.activo ? "Pausar" : "Activar"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => borrar(c)}
                    aria-label="Eliminar"
                    className="ml-auto grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar cliente" : "Nuevo cliente"}
      >
        <div className="space-y-4">
          <Field label="Nombre">
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Diario El Sur"
              className={inputCls}
            />
          </Field>
          <Field label="Notas (opcional)">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Datos de contacto, observaciones…"
              rows={3}
              className={inputCls + " h-auto py-2"}
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pending}>
              {pending ? "Guardando…" : editing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
