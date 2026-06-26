"use client";

import { Badge } from "@scrapify/ui/badge";
import { Button } from "@scrapify/ui/button";
import { Card, CardBody } from "@scrapify/ui/card";
import { Field, Modal, inputCls } from "@scrapify/ui/modal";
import { PageHeader } from "@scrapify/ui/page-header";
import { Toast, useToast } from "@scrapify/ui/toast";
import { Info, Link2, Plus, Power, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { RedIcon } from "@/components/icons/redes";
import {
  agregarCuenta,
  eliminarCuenta,
  toggleCuentaConexion,
  type ClienteConCuentas,
  type Plataforma,
} from "@/server/cuentas";

const PLATAFORMAS: Record<Plataforma, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#d6336c" },
  facebook: { label: "Facebook", color: "#3b5998" },
  tiktok: { label: "TikTok", color: "#111111" },
};

export function CuentasBoard({ clientes }: { clientes: ClienteConCuentas[] }) {
  const router = useRouter();
  const { message, show } = useToast();
  const [pending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [plataforma, setPlataforma] = useState<Plataforma>("instagram");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hayClientes = clientes.length > 0;

  function abrir() {
    setClienteId(clientes[0]?.id ?? "");
    setPlataforma("instagram");
    setNombre("");
    setError(null);
    setOpen(true);
  }

  function guardar() {
    if (!clienteId) return setError("Elegí un cliente.");
    if (!nombre.trim()) return setError("El usuario/handle es obligatorio.");
    startTransition(async () => {
      try {
        await agregarCuenta(clienteId, plataforma, nombre);
        setOpen(false);
        router.refresh();
        show("Cuenta agregada");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo agregar.");
      }
    });
  }

  function toggle(id: string, conectar: boolean) {
    startTransition(async () => {
      await toggleCuentaConexion(id, conectar);
      router.refresh();
      show(conectar ? "Cuenta conectada" : "Cuenta desconectada");
    });
  }

  function borrar(id: string, label: string) {
    if (!window.confirm(`¿Eliminar la cuenta "${label}"?`)) return;
    startTransition(async () => {
      await eliminarCuenta(id);
      router.refresh();
      show("Cuenta eliminada");
    });
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Cuentas"
        subtitle="Las cuentas de redes de cada cliente."
        action={
          hayClientes ? (
            <Button onClick={abrir}>
              <Plus className="size-4" />
              Conectar cuenta
            </Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex items-start gap-2.5 rounded-[var(--radius)] border border-info/30 bg-info/8 px-4 py-3 text-sm text-fg">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          Por ahora cargás y administrás las cuentas. La{" "}
          <strong className="font-medium">conexión real con Meta y TikTok</strong>{" "}
          (OAuth) se habilita al final, para las pruebas de publicación.
        </p>
      </div>

      {!hayClientes ? (
        <Card>
          <CardBody className="flex flex-col items-center py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-line bg-elevated text-muted">
              <Users className="size-6" />
            </span>
            <p className="mt-4 font-display text-lg font-medium text-fg">
              Primero creá un cliente
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              Las cuentas de redes se asocian a un cliente. Creá uno en la
              sección Clientes.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {clientes.map((c) => (
            <Card key={c.id}>
              <CardBody>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-sm font-semibold text-accent">
                    {c.nombre.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-display text-base font-medium text-fg">
                    {c.nombre}
                  </span>
                  <span className="ml-auto text-xs text-muted">
                    {c.cuentas.length}{" "}
                    {c.cuentas.length === 1 ? "cuenta" : "cuentas"}
                  </span>
                </div>

                {c.cuentas.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-muted">
                    Sin cuentas conectadas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {c.cuentas.map((a) => {
                      const p = PLATAFORMAS[a.plataforma];
                      const conectada = a.estado === "conectada";
                      return (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 rounded-lg border border-line/70 bg-surface px-3 py-2.5"
                        >
                          <RedIcon plataforma={a.plataforma} className="size-5" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-fg">
                              @{a.nombre}
                            </p>
                            <p className="text-xs text-muted">{p.label}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-1.5">
                            <Badge tone={conectada ? "success" : "neutral"}>
                              {conectada ? "Conectada" : "Desconectada"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggle(a.id, !conectada)}
                            >
                              <Power className="size-3.5" />
                              {conectada ? "Desconectar" : "Conectar"}
                            </Button>
                            <button
                              type="button"
                              onClick={() => borrar(a.id, a.nombre)}
                              aria-label="Eliminar"
                              className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Conectar cuenta">
        <div className="space-y-4">
          <Field label="Cliente">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className={inputCls}
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Plataforma">
            <div className="flex gap-2">
              {(Object.keys(PLATAFORMAS) as Plataforma[]).map((p) => {
                const meta = PLATAFORMAS[p];
                const sel = plataforma === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlataforma(p)}
                    className={
                      "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors " +
                      (sel
                        ? "border-accent bg-accent/10 text-fg"
                        : "border-line text-muted hover:bg-elevated")
                    }
                  >
                    <RedIcon plataforma={p} className="size-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Usuario / handle">
            <div className="flex items-center gap-2">
              <Link2 className="size-4 shrink-0 text-muted" />
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="diarioelsur"
                className={inputCls}
              />
            </div>
          </Field>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={pending}>
              {pending ? "Agregando…" : "Agregar"}
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
