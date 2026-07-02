"use client";

import { Globe, Plus, Send, Tags, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Modal, inputCls } from "@/components/ui/modal";
import { PageHeader, Stat } from "@/components/ui/page-header";
import { Toast, useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  createDestino,
  deleteDestino,
  probarConexion,
  setDestinoCategorias,
  type DestinoTipo,
} from "@/server/destinos";

export type DestinoRow = {
  id: string;
  nombre: string;
  tipo: DestinoTipo;
  endpoint: string;
  categorias: string[];
  activo: boolean;
  publicadas: number;
};

function CategoriasInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [txt, setTxt] = useState("");
  function add() {
    const c = txt.trim();
    if (c && !value.some((x) => x.toLowerCase() === c.toLowerCase())) {
      onChange([...value, c]);
    }
    setTxt("");
  }
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-xs text-fg"
            >
              {c}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== c))}
                className="text-muted hover:text-danger"
                aria-label={`Quitar ${c}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Ej. Deportes"
          className={inputCls}
        />
        <Button variant="outline" type="button" onClick={add}>
          Agregar
        </Button>
      </div>
    </div>
  );
}

export function DestinosBoard({ destinos }: { destinos: DestinoRow[] }) {
  const [pending, startTransition] = useTransition();
  const { message, show } = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<DestinoTipo>("wordpress_cliente");
  const [endpoint, setEndpoint] = useState("");
  const [username, setUsername] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [probando, setProbando] = useState(false);

  // Edición de categorías de un destino existente.
  const [editDest, setEditDest] = useState<DestinoRow | null>(null);
  const [editCats, setEditCats] = useState<string[]>([]);

  const esWp = tipo === "wordpress_cliente";
  const wp = destinos.filter((d) => d.tipo === "wordpress_cliente").length;
  const propios = destinos.filter((d) => d.tipo === "sitio_propio").length;

  function remove(d: DestinoRow) {
    startTransition(async () => {
      await deleteDestino(d.id);
      show(`${d.nombre} eliminado`);
    });
  }

  function resetForm() {
    setNombre("");
    setEndpoint("");
    setUsername("");
    setAppPassword("");
    setCategorias([]);
    setTipo("wordpress_cliente");
  }

  function guardarCats() {
    if (!editDest) return;
    const id = editDest.id;
    const cats = editCats;
    setEditDest(null);
    startTransition(async () => {
      await setDestinoCategorias(id, cats);
      show("Categorías guardadas");
    });
  }

  async function probar() {
    if (!endpoint.trim() || !username.trim() || !appPassword.trim()) return;
    setProbando(true);
    const r = await probarConexion({
      endpoint: endpoint.trim(),
      username: username.trim(),
      appPassword: appPassword.trim(),
    });
    setProbando(false);
    show(r.mensaje);
  }

  function submitAdd() {
    if (!nombre.trim() || !endpoint.trim()) return;
    if (esWp && (!username.trim() || !appPassword.trim())) return;
    startTransition(async () => {
      await createDestino({
        nombre: nombre.trim(),
        tipo,
        endpoint: endpoint.trim(),
        categorias,
        username: esWp ? username.trim() : undefined,
        appPassword: esWp ? appPassword.trim() : undefined,
      });
      resetForm();
      setOpenAdd(false);
      show("Destino agregado");
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Destinos"
        subtitle="WordPress de clientes (push) y sitios propios headless (pull)."
        action={
          <Button onClick={() => setOpenAdd(true)}>
            <Plus className="size-4" />
            Agregar destino
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Total" value={String(destinos.length)} />
        <Stat label="WordPress" value={String(wp)} />
        <Stat label="Sitios propios" value={String(propios)} />
      </div>

      {destinos.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Sin destinos todavía"
          description="Agregá un WordPress de cliente o un sitio propio para publicar las notas."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className={cn("divide-y divide-line/60", pending && "opacity-60")}>
            {destinos.map((d) => {
              const esWp = d.tipo === "wordpress_cliente";
              return (
                <div key={d.id} className="flex items-center gap-4 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
                    {esWp ? (
                      <Globe className="size-4" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">
                      {d.nombre}
                    </p>
                    <p className="truncate font-mono text-xs text-muted">
                      {d.endpoint}
                    </p>
                    {d.categorias.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.categorias.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-elevated px-1.5 py-0.5 text-[10px] text-muted"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditDest(d);
                      setEditCats(d.categorias);
                    }}
                    aria-label="Categorías"
                    title="Categorías que publica"
                  >
                    <Tags className="size-4 text-muted" />
                  </Button>
                  <Badge className="hidden sm:inline-flex">
                    {esWp ? "WordPress" : "Sitio propio"}
                  </Badge>
                  <div className="hidden w-24 text-right md:block">
                    <p className="font-mono text-sm text-fg">
                      {d.publicadas.toLocaleString("es")}
                    </p>
                    <p className="text-xs text-muted">publicadas</p>
                  </div>
                  <Badge tone={d.activo ? "success" : "danger"}>
                    {d.activo ? "activo" : "error"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(d)}
                    disabled={pending}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4 text-muted" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Agregar destino"
      >
        <div className="space-y-4">
          <Field label="Nombre">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Diario Cliente A"
              className={inputCls}
            />
          </Field>
          <Field label="Tipo">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as DestinoTipo)}
              className={inputCls}
            >
              <option value="wordpress_cliente">WordPress · cliente</option>
              <option value="sitio_propio">Sitio propio · headless</option>
            </select>
          </Field>
          <Field label={esWp ? "Endpoint REST API" : "Slug / feed"}>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder={
                esWp ? "https://diario.com/wp-json" : "feed/economia"
              }
              className={inputCls}
            />
          </Field>
          <Field label="Categorías que publica">
            <CategoriasInput value={categorias} onChange={setCategorias} />
          </Field>
          {esWp && (
            <>
              <Field label="Usuario de WordPress">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="editor"
                  autoComplete="off"
                  className={inputCls}
                />
              </Field>
              <Field label="Contraseña de aplicación">
                <input
                  type="password"
                  value={appPassword}
                  onChange={(e) => setAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  autoComplete="off"
                  className={inputCls}
                />
              </Field>
              <p className="text-xs text-muted">
                Se genera en WordPress: Perfil → Contraseñas de aplicación. Se
                guarda cifrada (AES-256).
              </p>
            </>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            {esWp && (
              <Button
                variant="outline"
                onClick={probar}
                disabled={
                  probando ||
                  !endpoint.trim() ||
                  !username.trim() ||
                  !appPassword.trim()
                }
                className="mr-auto"
              >
                {probando ? "Probando…" : "Probar conexión"}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpenAdd(false)}>
              Cancelar
            </Button>
            <Button onClick={submitAdd} disabled={pending}>
              Agregar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!editDest}
        onClose={() => setEditDest(null)}
        title={`Categorías · ${editDest?.nombre ?? ""}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Qué categorías publica este sitio. La ingesta las usa para traer y
            filtrar las notas de este destino.
          </p>
          <CategoriasInput value={editCats} onChange={setEditCats} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setEditDest(null)}>
              Cancelar
            </Button>
            <Button onClick={guardarCats} disabled={pending}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      <Toast message={message} />
    </div>
  );
}
