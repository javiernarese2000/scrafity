"use client";

import { Card, CardBody } from "@scrapify/ui/card";
import { PageHeader } from "@scrapify/ui/page-header";
import {
  AtSign,
  Clapperboard,
  Download,
  LogIn,
  Search,
  Send,
  ShieldAlert,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { AuditRow } from "@/server/auditoria";
import { listarAuditoria } from "@/server/auditoria";

type Tono = "success" | "danger" | "warning" | "info" | "accent";

type Cat = {
  id: string;
  label: string;
  icon: LucideIcon;
  tono: Tono;
};

// Categoría por prefijo de la acción → ícono + color.
const CATS: Record<string, Cat> = {
  publicacion: { id: "publicacion", label: "Publicaciones", icon: Send, tono: "success" },
  render: { id: "render", label: "Renders", icon: Clapperboard, tono: "accent" },
  cliente: { id: "cliente", label: "Clientes", icon: Users, tono: "warning" },
  cuenta: { id: "cuenta", label: "Cuentas", icon: AtSign, tono: "info" },
  usuario: { id: "usuario", label: "Usuarios", icon: UserCog, tono: "accent" },
  auth: { id: "auth", label: "Accesos", icon: LogIn, tono: "info" },
};

function catDe(accion: string): Cat {
  const pref = accion.split(".")[0] ?? "";
  return CATS[pref] ?? { id: pref, label: pref, icon: ShieldAlert, tono: "info" };
}

const TONO_CLS: Record<Tono, { dot: string; chip: string }> = {
  success: { dot: "bg-success/15 text-success", chip: "bg-success/10 text-success" },
  danger: { dot: "bg-danger/15 text-danger", chip: "bg-danger/10 text-danger" },
  warning: { dot: "bg-warning/15 text-warning", chip: "bg-warning/10 text-warning" },
  info: { dot: "bg-info/15 text-info", chip: "bg-info/10 text-info" },
  accent: { dot: "bg-accent/15 text-accent", chip: "bg-accent/10 text-accent" },
};

function inicial(s: string | null) {
  return (s ?? "S").trim().charAt(0).toUpperCase() || "S";
}

function relativo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "recién";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function exacto(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function diaLabel(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, hoy)) return "Hoy";
  if (sameDay(d, ayer)) return "Ayer";
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function Kpi({ label, valor, tono }: { label: string; valor: number; tono?: Tono }) {
  return (
    <Card>
      <CardBody className="py-4">
        <p
          className={
            "font-mono text-2xl font-medium " +
            (tono ? TONO_CLS[tono].dot.split(" ")[1] : "text-fg")
          }
        >
          {valor}
        </p>
        <p className="mt-0.5 text-xs text-muted">{label}</p>
      </CardBody>
    </Card>
  );
}

export function AuditoriaBoard({ inicial }: { inicial: AuditRow[] }) {
  const [rows, setRows] = useState<AuditRow[]>(inicial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("todas");
  const [actor, setActor] = useState<string>("todos");
  const [soloErr, setSoloErr] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);

  // En vivo: refresca cada 15s.
  useEffect(() => {
    const t = setInterval(() => {
      listarAuditoria().then(setRows).catch(() => {});
    }, 15_000);
    return () => clearInterval(t);
  }, []);

  const actores = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.actorEmail && s.add(r.actorEmail));
    return [...s].sort();
  }, [rows]);

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat !== "todas" && catDe(r.accion).id !== cat) return false;
      if (actor !== "todos" && r.actorEmail !== actor) return false;
      if (soloErr && r.resultado !== "error") return false;
      if (
        term &&
        !`${r.resumen} ${r.actorEmail ?? ""} ${r.actorNombre ?? ""}`
          .toLowerCase()
          .includes(term)
      )
        return false;
      return true;
    });
  }, [rows, q, cat, actor, soloErr]);

  // KPIs de hoy.
  const kpis = useMemo(() => {
    const hoy = new Date();
    const esHoy = (iso: string) => {
      const d = new Date(iso);
      return (
        d.getFullYear() === hoy.getFullYear() &&
        d.getMonth() === hoy.getMonth() &&
        d.getDate() === hoy.getDate()
      );
    };
    const deHoy = rows.filter((r) => esHoy(r.createdAt));
    return {
      acciones: deHoy.length,
      publicaciones: deHoy.filter(
        (r) => r.accion === "publicacion.publicar" && r.resultado === "ok",
      ).length,
      errores: deHoy.filter((r) => r.resultado === "error").length,
      usuarios: new Set(deHoy.map((r) => r.actorEmail)).size,
    };
  }, [rows]);

  // Agrupado por día (preservando orden desc).
  const grupos = useMemo(() => {
    const out: { dia: string; items: AuditRow[] }[] = [];
    for (const r of filtradas) {
      const dia = diaLabel(r.createdAt);
      const last = out[out.length - 1];
      if (last && last.dia === dia) last.items.push(r);
      else out.push({ dia, items: [r] });
    }
    return out;
  }, [filtradas]);

  function exportarCsv() {
    const head = ["fecha", "actor", "accion", "resumen", "resultado", "error"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lineas = filtradas.map((r) =>
      [
        exacto(r.createdAt),
        r.actorEmail ?? "",
        r.accion,
        r.resumen,
        r.resultado,
        r.error ?? "",
      ]
        .map((c) => esc(String(c)))
        .join(","),
    );
    const csv = [head.join(","), ...lineas].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full">
      <PageHeader
        title="Auditoría"
        subtitle="Quién hizo qué y cuándo. Solo visible para administradores."
        action={
          <button
            type="button"
            onClick={exportarCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-muted hover:bg-elevated hover:text-fg"
          >
            <Download className="size-3.5" />
            Exportar CSV
          </button>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Acciones hoy" valor={kpis.acciones} />
        <Kpi label="Publicaciones hoy" valor={kpis.publicaciones} tono="success" />
        <Kpi label="Errores hoy" valor={kpis.errores} tono="danger" />
        <Kpi label="Usuarios activos hoy" valor={kpis.usuarios} tono="info" />
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3">
          <Search className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="h-9 w-44 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="todas">Todas las categorías</option>
          {Object.values(CATS).map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="todos">Todos los usuarios</option>
          {actores.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSoloErr((v) => !v)}
          className={
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors " +
            (soloErr
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-line text-muted hover:bg-elevated")
          }
        >
          <ShieldAlert className="size-3.5" />
          Solo errores
        </button>
      </div>

      {/* Timeline */}
      {filtradas.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center text-sm text-muted">
            No hay eventos con esos filtros.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.dia}>
              <p className="mb-2 px-1 font-mono text-[11px] uppercase tracking-widest text-muted">
                {g.dia}
              </p>
              <div className="space-y-1.5">
                {g.items.map((r) => {
                  const c = catDe(r.accion);
                  const err = r.resultado === "error";
                  const Icon = c.icon;
                  const tono: Tono = err ? "danger" : c.tono;
                  const abierta = abierto === r.id;
                  return (
                    <div
                      key={r.id}
                      className="overflow-hidden rounded-[var(--radius-lg)] border border-line/70 bg-surface shadow-soft"
                    >
                      <button
                        type="button"
                        onClick={() => setAbierto(abierta ? null : r.id)}
                        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-elevated/50"
                      >
                        <span
                          className={
                            "grid size-9 shrink-0 place-items-center rounded-lg " +
                            TONO_CLS[tono].dot
                          }
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-fg">{r.resumen}</p>
                          <p className="truncate text-xs text-muted">
                            {r.actorNombre || r.actorEmail || "Sistema"}
                            {" · "}
                            <span title={exacto(r.createdAt)}>
                              {relativo(r.createdAt)}
                            </span>
                          </p>
                        </div>
                        {err && (
                          <span className="shrink-0 rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                            error
                          </span>
                        )}
                        <span
                          className={
                            "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline " +
                            TONO_CLS[c.tono].chip
                          }
                        >
                          {c.label}
                        </span>
                      </button>

                      {abierta && (
                        <div className="border-t border-line/60 bg-elevated/40 px-3 py-3 text-xs">
                          <Detalle k="Cuándo" v={exacto(r.createdAt)} />
                          <Detalle k="Usuario" v={r.actorEmail ?? "Sistema"} />
                          <Detalle k="Acción" v={r.accion} />
                          {r.entidadId && <Detalle k="ID" v={r.entidadId} />}
                          {r.error && (
                            <Detalle k="Error" v={r.error} tono="danger" />
                          )}
                          {r.meta && Object.keys(r.meta).length > 0 && (
                            <div className="mt-2">
                              <p className="mb-1 text-muted">Detalle</p>
                              <pre className="overflow-x-auto rounded-lg bg-canvas/60 p-2 font-mono text-[11px] text-fg">
                                {JSON.stringify(r.meta, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Detalle({
  k,
  v,
  tono,
}: {
  k: string;
  v: ReactNode;
  tono?: "danger";
}) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-20 shrink-0 text-muted">{k}</span>
      <span className={tono === "danger" ? "text-danger" : "text-fg"}>{v}</span>
    </div>
  );
}
