"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BookOpen,
  Calendar,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Warehouse,
  ClipboardList,
  Wrench,
  Bot,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Clock,
  FileText,
  Receipt,
  Mail,
  FileSignature,
  Award,
  Truck,
  Store,
  AlertTriangle,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/providers/sidebar-provider";
import UserNav from "./user-nav";
import type { RbacConfig } from "@/app/actions/rbac";

export const dashboardItem = {
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};

export const navigationGroups = [
  {
    label: "Inventory",
    items: [
      {
        name: "Spareparts",
        icon: Package,
        children: [
          { name: "Sparepart Production", href: "/inventory", icon: Package },
          {
            name: "Sparepart Project",
            href: "/sparepart-project",
            icon: FolderKanban,
          },
          { name: "POS Barang", href: "/pos-barang", icon: ShoppingCart },
          {
            name: "Rack Management",
            href: "/rack-management",
            icon: Warehouse,
          },
        ],
      },
      { name: "Product Ichibot", href: "/catalogue", icon: BookOpen, excludeRoles: ["EXTERNAL"] },
      { name: "Production Plan", href: "/production-plan", icon: Calendar },
      { name: "Aset Mesin/Alat", href: "/assets", icon: Wrench, excludeRoles: ["EXTERNAL"] },
      {
        name: "Setting",
        href: "/catalogue/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Store",
    excludeRoles: ["EXTERNAL"],
    items: [
      { name: "Store Product", href: "/store/product", icon: Package },
      { name: "POS Store", href: "/store/pos", icon: Store },
      {
        name: "Low Stock",
        href: "/store/low-stock",
        icon: AlertTriangle,
        adminOnly: true,
      },
      { name: "Purchased", href: "/store/purchased", icon: CheckCircle2 },
      {
        name: "Setting",
        href: "/store/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Administrasi",
    excludeRoles: ["EXTERNAL"],
    items: [
      {
        name: "Administrasi",
        icon: FileText,
        excludeRoles: ["USER", "TEKNISI"],
        children: [
          {
            name: "Surat Penawaran",
            href: "/administrasi/surat-penawaran",
            icon: FileText,
          },
          { name: "Kwitansi", href: "/administrasi/kwitansi", icon: Receipt },
          {
            name: "Surat Balasan",
            href: "/administrasi/surat-balasan",
            icon: Mail,
          },
          {
            name: "Surat Undangan",
            href: "/administrasi/surat-undangan",
            icon: Mail,
          },
          { name: "MoU", href: "/administrasi/mou", icon: FileSignature },
          {
            name: "Invoice (ID)",
            href: "/administrasi/invoice-id",
            icon: Receipt,
          },
          {
            name: "Invoice (EN)",
            href: "/administrasi/invoice-en",
            icon: Receipt,
          },
          {
            name: "Invoice GAN",
            href: "/administrasi/invoice-gan",
            icon: Receipt,
          },
          {
            name: "Penugasan",
            href: "/administrasi/penugasan",
            icon: FileSignature,
          },
          {
            name: "Surat Jalan",
            href: "/administrasi/surat-jalan",
            icon: Truck,
          },
          {
            name: "Certificate",
            href: "/administrasi/certificate",
            icon: Award,
          },
        ],
      },
      {
        name: "Daftar Resi",
        href: "/administrasi/daftar-resi",
        icon: Package,
        excludeRoles: ["EXTERNAL"],
      },
      {
        name: "Permintaan Barang",
        href: "/administrasi/permintaan-barang",
        icon: ClipboardList,
        excludeRoles: ["EXTERNAL"],
      },
      {
        name: "Daftar Harga",
        href: "/administrasi/daftar-harga",
        icon: Banknote,
        excludeRoles: ["EXTERNAL"],
      },
    ],
  },
  {
    label: "Teknisi",
    roles: ["ADMIN", "TEKNISI"],
    items: [
      { name: "Service Robot", href: "/service-robot", icon: Bot },
      { name: "POS Service", href: "/pos-service", icon: ShoppingCart },
    ],
  },
  {
    label: "PROJECT",
    items: [
      { name: "Daftar Project", href: "/projects", icon: ClipboardList },
      {
        name: "Setting Project",
        href: "/projects/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        name: "HR Dashboard",
        href: "/hrd-dashboard",
        icon: LayoutDashboard,
        adminOnly: true,
      },
      {
        name: "Human Resource",
        icon: Users,
        children: [
          { name: "Absensi", href: "/attendance", icon: Clock },
          { name: "Izin/Lembur", href: "/overtime-leave", icon: ClipboardList },
          { name: "Data Lainnya", href: "/hr-other-data", icon: FolderKanban, excludeRoles: ["EXTERNAL"] },
          { name: "Kalender", href: "/calendar", icon: Calendar },
        ],
      },
      { name: "Log Activity", href: "/log-activity", icon: ClipboardList },
      {
        name: "Setting HR",
        href: "/hr-settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
  {
    label: "Admin",
    roles: ["ADMIN"],
    items: [
      { name: "Users", href: "/users", icon: Users },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ userRole, rbacConfig }: { userRole?: string; rbacConfig?: RbacConfig | null }) {
  const { isOpen, isMobileOpen, setIsMobileOpen } = useSidebar();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const pathname = usePathname();

  // RBAC helper: check if a href is allowed for the current role
  const isHrefAllowed = (href: string): boolean => {
    if (!rbacConfig) return true; // No config = allow all (backward compat)
    if (userRole === "ADMIN") return true; // Admin always allowed
    const allowedRoles = rbacConfig[href];
    if (!allowedRoles) return true; // href not in config = allow (not managed)
    return allowedRoles.includes(userRole || "");
  };

  // RBAC filter: check if an item (or any of its children) should be shown
  const isItemAllowed = (item: any): boolean => {
    if (item.href) return isHrefAllowed(item.href);
    if (item.children) return item.children.some((child: any) => isItemAllowed(child));
    return true;
  };

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const NavItem = ({ item, isCollapsed, isSubItem = false }: any) => {
    const hasChildren = !!(item.children && item.children.length > 0);
    const isMenuOpen = openMenus.includes(item.name);
    const isActive = pathname === item.href;
    const isChildActive =
      hasChildren && item.children.some((c: any) => pathname === c.href);
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div className="space-y-1">
          <button
            onClick={() => toggleMenu(item.name)}
            className={cn(
              "w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isChildActive
                ? "bg-white/10 text-white font-semibold"
                : "text-white/80 hover:bg-white/10 hover:text-white",
              isCollapsed && "justify-center px-2",
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-3")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.name}</span>
                {isMenuOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </>
            )}
          </button>
          {isMenuOpen && !isCollapsed && (
            <div className="ml-4 space-y-1 border-l border-white/20 pl-2">
              {item.children.map((child: any) => {
                if (rbacConfig) {
                  // RBAC mode: only check RBAC config
                  if (!isItemAllowed(child)) return null;
                } else {
                  // Legacy mode: use hardcoded filters
                  if (child.adminOnly && userRole !== "ADMIN") return null;
                  if (child.excludeRoles && child.excludeRoles.includes(userRole)) return null;
                }
                return (
                  <NavItem
                    key={child.name}
                    item={child}
                    isCollapsed={isCollapsed}
                    isSubItem={true}
                  />
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        onClick={() => setIsMobileOpen(false)}
        className={cn(
          "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
          isActive
            ? "bg-white/10 text-white font-semibold shadow-sm"
            : "text-white/80 hover:bg-white/10 hover:text-white",
          isCollapsed && "justify-center px-2",
          isSubItem && "py-1.5",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            !isCollapsed && "mr-3",
            isSubItem && "h-4 w-4",
          )}
        />
        {!isCollapsed && <span className="truncate">{item.name}</span>}
      </Link>
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "bg-[#2563eb] border-r border-[#2563eb] transition-all duration-300 flex flex-col h-full",
          // Mobile state
          "fixed inset-y-0 left-0 z-50",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop state
          "md:relative md:translate-x-0 md:z-60",
          isOpen ? "w-64" : "w-20",
          "overflow-hidden"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 transition-all duration-300 border-b border-white/10",
            isOpen ? "px-4 h-[65px] justify-center" : "h-[65px] items-center justify-center px-4"
          )}
        >
          {isOpen ? (
            <div className="flex flex-col justify-center">
              <div className="flex items-start justify-between gap-2">
                <Link href="/dashboard" className="group flex flex-col transition-opacity hover:opacity-80">
                  <h1 className="text-xl font-black text-white tracking-tight uppercase leading-none drop-shadow-sm">
                    SIGMA ICHIBOT
                  </h1>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <span className="text-xl font-black text-white tracking-tight leading-none drop-shadow-sm">SI</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 sidebar-scrollbar">
          <NavItem item={dashboardItem} isCollapsed={!isOpen} />

          {navigationGroups.map((group) => {
            if (!rbacConfig) {
              // Legacy mode: use hardcoded group-level filters
              if (group.roles && !group.roles.includes(userRole || ""))
                return null;
              if (group.excludeRoles && group.excludeRoles.includes(userRole || ""))
                return null;
            }

            // In RBAC mode: check if any item in this group is allowed
            if (rbacConfig && userRole !== "ADMIN") {
              const hasAnyAllowedItem = (group.items as any[]).some((item: any) => isItemAllowed(item));
              if (!hasAnyAllowedItem) return null;
            }

            return (
              <div key={group.label} className="pt-4 pb-1">
                <div className="border-t border-white/10 mx-2" />
                {isOpen && (
                  <p className="px-3 pt-2 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                <div className="mt-1 space-y-1">
                  {group.items.map((item: any) => {
                    if (rbacConfig) {
                      // RBAC mode: only check RBAC config
                      if (!isItemAllowed(item)) return null;
                    } else {
                      // Legacy mode: use hardcoded filters
                      if (item.adminOnly && userRole !== "ADMIN") return null;
                      if (
                        item.excludeRoles &&
                        item.excludeRoles.includes(userRole)
                      )
                        return null;
                    }
                    return (
                      <NavItem
                        key={item.name}
                        item={item}
                        isCollapsed={!isOpen}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
