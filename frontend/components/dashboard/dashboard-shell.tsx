"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/models";

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  userName: string;
}

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/empresas", label: "Empresas", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
];

const userNav = [
  { href: "/usuario", label: "Chat", icon: MessageSquare },
  { href: "/usuario/documentos", label: "Documentos", icon: FileText },
];

export function DashboardShell({
  children,
  role,
  userName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navItems = role === "admin" ? adminNav : userNav;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Contenido de navegación reutilizable
  const navContent = (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3">
        <Separator className="mb-3" />
        <div className="flex items-center justify-between px-3">
          <span className="text-sm font-medium truncate">{userName}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Header móvil */}
      <header className="md:hidden flex items-center h-14 px-4 border-b shrink-0">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SheetHeader className="h-14 flex items-center px-6 border-b">
              <SheetTitle className="font-bold text-lg">Stoodeo Chat</SheetTitle>
            </SheetHeader>
            {navContent}
          </SheetContent>
        </Sheet>
        <span className="font-bold text-lg ml-3">Stoodeo Chat</span>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 border-r flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b">
          <span className="font-bold text-lg">Stoodeo Chat</span>
        </div>
        {navContent}
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
