import {
  BookOpen,
  CalendarDays,
  Images,
  Inbox,
  LayoutDashboard,
  Library,
  Link2,
  Newspaper,
  Rss,
  Radio,
  Send,
  SendHorizontal,
  Settings,
  Trash2,
  UserCog,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/noticias", label: "Noticias", icon: Rss },
  { href: "/curaduria", label: "Bandeja de entrada", icon: Inbox, adminOnly: true },
  { href: "/moderacion", label: "Moderación", icon: Newspaper, adminOnly: true },
  { href: "/bandeja", label: "Bandeja de salida", icon: SendHorizontal },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/pegar", label: "Pegar URL", icon: Link2 },
  { href: "/escenarios", label: "Escenarios", icon: Workflow, adminOnly: true },
  { href: "/fuentes", label: "Fuentes", icon: Radio, adminOnly: true },
  { href: "/destinos", label: "Destinos", icon: Send, adminOnly: true },
  { href: "/multimedia", label: "Multimedia", icon: Images },
  { href: "/papelera", label: "Papelera", icon: Trash2 },
  { href: "/ayuda", label: "Ayuda", icon: BookOpen },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, adminOnly: true },
  { href: "/ajustes", label: "Ajustes", icon: Settings, adminOnly: true },
];

export function titleForPath(pathname: string): string {
  const match = navItems.find(
    (i) => i.href === pathname || (i.href !== "/" && pathname.startsWith(i.href)),
  );
  return match?.label ?? "Scrapify";
}
