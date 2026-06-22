import {
  LayoutDashboard,
  Library,
  Link2,
  Newspaper,
  Radio,
  Send,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/pegar", label: "Pegar URL", icon: Link2 },
  { href: "/moderacion", label: "Moderación", icon: Newspaper },
  { href: "/fuentes", label: "Fuentes", icon: Radio },
  { href: "/destinos", label: "Destinos", icon: Send },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

export function titleForPath(pathname: string): string {
  const match = navItems.find(
    (i) => i.href === pathname || (i.href !== "/" && pathname.startsWith(i.href)),
  );
  return match?.label ?? "Scrapify";
}
