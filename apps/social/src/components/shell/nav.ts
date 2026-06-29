import {
  AtSign,
  CalendarClock,
  Clapperboard,
  Film,
  LayoutDashboard,
  Megaphone,
  Send,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/estudio", label: "Estudio", icon: Clapperboard },
  { href: "/renders", label: "Renders", icon: Film },
  { href: "/componer", label: "Componer", icon: Megaphone },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/cuentas", label: "Cuentas", icon: AtSign },
  { href: "/publicaciones", label: "Publicaciones", icon: Send },
  { href: "/usuarios", label: "Usuarios", icon: UserCog },
];

export function titleForPath(pathname: string): string {
  const match = navItems.find(
    (i) => i.href === pathname || (i.href !== "/" && pathname.startsWith(i.href)),
  );
  return match?.label ?? "Zoocial";
}
