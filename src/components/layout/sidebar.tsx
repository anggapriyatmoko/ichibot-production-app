"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  LogOut,
  BookOpen,
  Calendar,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Warehouse,
  ClipboardList,
  Wrench,
  Bot,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  UserCog,
  Clock,
  FileText,
  Receipt,
  Mail,
  FileSignature,
  Award,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TimeDisplay from "./time-display";
import { useSidebar } from "@/components/providers/sidebar-provider";

const dashboardItem = {
  name: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};

const barangNavigation = [
  {
    name: "Spareparts",
    icon: Package,
    children: [
      { name: "Sparepart Production", href: "/inventory", icon: Package },
      { name: "POS Production", href: "/pos", icon: ShoppingCart },
      {
        name: "Sparepart Project",
        href: "/sparepart-project",
        icon: FolderKanban,
      },
      { name: "POS Project", href: "/pos-project", icon: ShoppingCart },
      { name: "Rack Management", href: "/rack-management", icon: Warehouse },
    ],
  },
  { name: "Product Ichibot", href: "/catalogue", icon: BookOpen },
  { name: "Production Plan", href: "/production-plan", icon: Calendar },
  {
    name: "Activity",
    icon: ClipboardList,
    children: [
      { name: "History", href: "/history", icon: LayoutDashboard },
      { name: "Log Activity", href: "/log-activity", icon: ClipboardList },
    ],
  },
  { name: "Aset Mesin/Alat", href: "/assets", icon: Wrench },
];

// Menu visible to ADMIN and TEKNISI only
const teknisiNavigation = [
  { name: "Service Robot", href: "/service-robot", icon: Bot },
];

const administrasiNavigation = [
  {
    name: "Administrasi",
    icon: FileText,
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
      { name: "MoU", href: "/administrasi/mou", icon: FileSignature },
      { name: "Invoice (ID)", href: "/administrasi/invoice-id", icon: Receipt },
      { name: "Invoice (EN)", href: "/administrasi/invoice-en", icon: Receipt },
      { name: "Invoice GAN", href: "/administrasi/invoice-gan", icon: Receipt },
      {
        name: "Penugasan",
        href: "/administrasi/penugasan",
        icon: FileSignature,
      },
      { name: "Surat Jalan", href: "/administrasi/surat-jalan", icon: Truck },
      { name: "Certificate", href: "/administrasi/certificate", icon: Award },
    ],
  },
];

const projectNavigation = [
  {
    name: "Project",
    icon: FolderKanban,
    children: [
      { name: "Daftar Project", href: "/projects", icon: ClipboardList },
      {
        name: "Setting",
        href: "/projects/settings",
        icon: Settings,
        adminOnly: true,
      },
    ],
  },
];

const hrdNavigation = [
  {
    name: "HRD Dashboard",
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
      { name: "Data Lainnya", href: "/hr-other-data", icon: FolderKanban },
      { name: "Kalender", href: "/calendar", icon: Calendar },
    ],
  },
  { name: "Setting", href: "/hr-settings", icon: Settings, adminOnly: true },
];

const adminNavigation = [
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const pathname = usePathname();

  // On initial mount, auto-open parent menu if child is active
  useEffect(() => {
    const allNav = [
      dashboardItem,
      ...projectNavigation,
      ...barangNavigation,
      ...teknisiNavigation,
      ...administrasiNavigation,
      ...hrdNavigation,
      ...adminNavigation,
    ];

    allNav.forEach((item) => {
      if ("children" in item && item.children) {
        const isChildActive = item.children.some(
          (child) => pathname === child.href,
        );
        if (isChildActive && !openMenus.includes(item.name)) {
          setOpenMenus((prev) => [...prev, item.name]);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const toggleMenu = (name: string) => {
    setOpenMenus(
      (prev) =>
        prev.includes(name)
          ? prev.filter((n) => n !== name) // Close only this dropdown
          : [...prev, name], // Open this dropdown, keep others
    );
  };

  // Helper for nav items to avoid duplication
  const NavItem = ({
    item,
    isCollapsed,
    isSubItem = false,
  }: {
    item: any;
    isCollapsed: boolean;
    isSubItem?: boolean;
  }) => {
    const hasChildren =
      "children" in item && item.children && item.children.length > 0;
    const isMenuOpen = openMenus.includes(item.name);
    const isActive = pathname === item.href;
    const isChildActive =
      hasChildren &&
      item.children.some((child: any) => pathname === child.href);

    if (hasChildren) {
      return (
        <div className="space-y-1">
          <button
            onClick={() => toggleMenu(item.name)}
            className={cn(
              "w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
              isChildActive
                ? "bg-primary/5 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              isCollapsed && "md:justify-center md:px-2",
            )}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon
              className={cn(
                "flex-shrink-0 transition-colors duration-200",
                "mr-3 h-5 w-5",
                isChildActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
                isCollapsed && "md:mr-0 md:h-6 md:w-6",
              )}
            />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.name}
                </span>
                {isMenuOpen ? (
                  <ChevronDown className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronRight className="h-4 w-4 ml-2" />
                )}
              </>
            )}
          </button>
          {isMenuOpen && !isCollapsed && (
            <div className="ml-4 space-y-1 border-l border-border pl-2">
              {item.children.map((child: any) => {
                // Filter based on adminOnly rule
                if (child.adminOnly && userRole !== "ADMIN") {
                  return null;
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
        key={item.name}
        href={item.href}
        onClick={() => {
          setIsMobileOpen(false);
          // Do not clear openMenus here.
          // Let useEffect handle menu state based on path to prevent flicker of default 'Spareparts' menu.
        }}
        title={isCollapsed ? item.name : undefined}
        className={cn(
          "group flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200",
          isSubItem ? "font-normal" : "font-medium",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isCollapsed && "md:justify-center md:px-2",
          isSubItem && "py-2",
        )}
      >
        <item.icon
          className={cn(
            "flex-shrink-0 transition-colors duration-200",
            "mr-3 h-5 w-5", // Base icon size and margin for expanded/mobile
            isActive
              ? "text-primary"
              : "text-muted-foreground group-hover:text-foreground",
            isCollapsed && "md:mr-0 md:h-6 md:w-6", // Override for desktop collapsed
            isSubItem && "h-4 w-4",
          )}
        />
        <span
          className={cn(
            "whitespace-nowrap transition-all duration-300",
            isCollapsed ? "md:hidden" : "block",
          )}
        >
          {item.name}
        </span>
      </Link>
    );
  };

  // Get current page title from navigation
  const getCurrentPageTitle = () => {
    const flattenNav = (nav: any[]): any[] => {
      return nav.reduce((acc, item) => {
        acc.push(item);
        if (item.children) {
          acc.push(...flattenNav(item.children));
        }
        return acc;
      }, []);
    };
    const allNav = flattenNav([
      dashboardItem,
      ...projectNavigation,
      ...barangNavigation,
      ...teknisiNavigation,
      ...administrasiNavigation,
      ...hrdNavigation,
      ...adminNavigation,
    ]);
    const current = allNav.find((item) => pathname === item.href);
    return current?.name || "Dashboard";
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300 transform",
          // Mobile: Translate based on state
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          // Desktop: Always show, handle width based on isOpen state
          "md:relative md:translate-x-0",
          isOpen ? "md:w-64" : "md:w-20",
        )}
      >
        {/* Desktop Header / Collapse Toggle */}
        <div
          className={cn(
            "hidden md:flex items-center border-b border-border h-16 transition-all duration-300",
            isOpen ? "justify-between px-6" : "justify-center",
          )}
        >
          {isOpen && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <Link href="/dashboard">
                <Image
                  src="/uploads/ichibot.png"
                  alt="Ichibot Production"
                  width={180}
                  height={40}
                  className="object-contain cursor-pointer"
                />
              </Link>
            </div>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Sidebar Header (Close Button) */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
          <span className="font-bold text-lg">Menu</span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <nav className="space-y-1">
            <NavItem item={dashboardItem} isCollapsed={!isOpen} />

            <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
              <div className="border-t border-border" />
              <p
                className={cn(
                  "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                  isOpen ? "px-3" : "text-center",
                )}
              >
                {isOpen ? "Barang" : "..."}
              </p>
            </div>
            {barangNavigation.map((item) => (
              <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
            ))}
          </nav>

          {/* Administrasi menu - visible for ADMIN, HRD, and ADMINISTRASI */}
          {["ADMIN", "HRD", "ADMINISTRASI"].includes(userRole || "") && (
            <>
              <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
                <div className="border-t border-border" />
                <p
                  className={cn(
                    "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    isOpen ? "px-3" : "text-center",
                  )}
                >
                  {isOpen ? "Administrasi" : "..."}
                </p>
              </div>
              <nav className="space-y-1">
                {administrasiNavigation.map((item) => (
                  <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
                ))}
              </nav>
            </>
          )}

          {/* Project menu - visible for ADMIN, HRD, ADMINISTRASI, and USER */}
          {["ADMIN", "HRD", "ADMINISTRASI", "USER", "TEKNISI"].includes(
            userRole || "",
          ) && (
              <>
                <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
                  <div className="border-t border-border" />
                  <p
                    className={cn(
                      "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                      isOpen ? "px-3" : "text-center",
                    )}
                  >
                    {isOpen ? "Project" : "..."}
                  </p>
                </div>
                <nav className="space-y-1">
                  {projectNavigation.map((item) => (
                    <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
                  ))}
                </nav>
              </>
            )}

          {/* Service Robot menu - visible to ADMIN and TEKNISI */}
          {["ADMIN", "TEKNISI"].includes(userRole || "") && (
            <>
              <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
                <div className="border-t border-border" />
                <p
                  className={cn(
                    "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    isOpen ? "px-3" : "text-center",
                  )}
                >
                  {isOpen ? "Service" : "..."}
                </p>
              </div>
              <nav className="space-y-1">
                {teknisiNavigation.map((item) => (
                  <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
                ))}
              </nav>
            </>
          )}

          {/* Human Resource menu - visible to all logged-in users */}
          {userRole && (
            <>
              <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
                <div className="border-t border-border" />
                <p
                  className={cn(
                    "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    isOpen ? "px-3" : "text-center",
                  )}
                >
                  {isOpen ? "Human Resource" : "..."}
                </p>
              </div>
              <nav className="space-y-1">
                {hrdNavigation.map((item) => {
                  // Filter based on adminOnly/Setting rule
                  if ((item as any).adminOnly || item.name === "Setting") {
                    if (!["ADMIN", "HRD"].includes(userRole || "")) {
                      return null;
                    }
                  }
                  return (
                    <NavItem
                      key={item.name}
                      item={item}
                      isCollapsed={!isOpen}
                    />
                  );
                })}
              </nav>
            </>
          )}

          {userRole === "ADMIN" && (
            <>
              <div className={cn("pt-4 pb-2", !isOpen && "hidden md:block")}>
                <div className="border-t border-border" />
                <p
                  className={cn(
                    "pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    isOpen ? "px-3" : "text-center",
                  )}
                >
                  {isOpen ? "Admin" : "..."}
                </p>
              </div>
              <nav className="space-y-1">
                {adminNavigation.map((item) => (
                  <NavItem key={item.name} item={item} isCollapsed={!isOpen} />
                ))}
              </nav>
            </>
          )}
        </div>
      </div>
    </>
  );
}
