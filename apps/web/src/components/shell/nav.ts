import {
  BookOpen,
  Images,
  Inbox,
  LayoutDashboard,
  Library,
  Link2,
  Newspaper,
  Radio,
  Send,
  SendHorizontal,
  Settings,
  Trash2,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/curaduria", label: "Bandeja de entrada", icon: Inbox },
  { href: "/moderacion", label: "Moderación", icon: Newspaper },
  { href: "/bandeja", label: "Bandeja de salida", icon: SendHorizontal },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/pegar", label: "Pegar URL", icon: Link2 },
  { href: "/escenarios", label: "Escenarios", icon: Workflow },
  { href: "/fuentes", label: "Fuentes", icon: Radio },
  { href: "/destinos", label: "Destinos", icon: Send },
  { href: "/multimedia", label: "Multimedia", icon: Images },
  { href: "/papelera", label: "Papelera", icon: Trash2 },
  { href: "/ayuda", label: "Ayuda", icon: BookOpen },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function titleForPath(pathname: string): string {
  const match = navItems.find(
    (i) => i.href === pathname || (i.href !== "/" && pathname.startsWith(i.href)),
  );
  return match?.label ?? "Scrapify";
}
