import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MapPin,
  Truck,
  Bell,
  Settings,
  ShieldCheck,
  UserCog,
  HardHat,
  Printer,
  ChevronRight,
  FileText,
  ClipboardCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard };

const mainNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
];

const petugasNav: NavItem[] = [
  { label: "Dashboard Petugas", to: "/dashboard/my-work", icon: HardHat },
  { label: "Laporan Lapangan", to: "/dashboard/field-reports", icon: ClipboardCheck },
  { label: "Notifikasi", to: "/dashboard/notifications", icon: Bell },
];

const moduleNav: NavItem[] = [
  { label: "Dashboard Petugas", to: "/dashboard/my-work", icon: HardHat },
  { label: "Penugasan", to: "/dashboard/tasks", icon: ClipboardList },
  { label: "Laporan Lapangan", to: "/dashboard/field-reports", icon: ClipboardCheck },
  { label: "Laporan Petugas (Admin)", to: "/dashboard/field-reports/admin", icon: FileText },
  { label: "Petugas Lapangan", to: "/dashboard/officers", icon: Users },
  { label: "Lokasi", to: "/dashboard/locations", icon: MapPin },
  { label: "Notifikasi", to: "/dashboard/notifications", icon: Bell },
];

const printSubNav: NavItem[] = [
  { label: "Daftar Petugas", to: "/dashboard/officers/print", icon: Users },
  { label: "Daftar Lokasi", to: "/dashboard/locations/print", icon: MapPin },
  { label: "Laporan Penugasan", to: "/dashboard/tasks/print", icon: ClipboardList },
  { label: "Laporan Lapangan", to: "/dashboard/reports/print", icon: FileText },
];

const systemNav: NavItem[] = [
  { label: "Kendaraan", to: "/dashboard", icon: Truck },
  { label: "Pengaturan", to: "/dashboard", icon: Settings },
];

export function AppSidebar() {
  const { location } = useRouterState();
  const { isSuperAdmin, isAdminTier, isManager, isPetugas } = useAuth();
  const canManage = isAdminTier || isManager;
  const petugasOnly = isPetugas && !canManage && !isSuperAdmin;

  const [printOpen, setPrintOpen] = useState(() =>
    location.pathname.includes("/print"),
  );

  const modules = moduleNav.filter((n) => {
    if (n.to === "/dashboard/officers" || n.to === "/dashboard/locations") {
      return canManage;
    }
    if (n.to === "/dashboard/field-reports/admin") {
      return canManage;
    }
    return true;
  });

  const renderItems = (items: NavItem[]) =>
    items.map((item) => {
      const active = location.pathname === item.to;
      const Icon = item.icon;
      return (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
            <Link to={item.to}>
              <Icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  // Simplified sidebar for field officer only
  if (petugasOnly) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">FWMS</span>
              <span className="text-xs text-muted-foreground">Petugas Lapangan</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(petugasNav)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            v0.4.0
          </div>
        </SidebarFooter>
      </Sidebar>
    );
  }

  const printActive = printSubNav.some((s) => location.pathname === s.to);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">FWMS</span>
            <span className="text-xs text-muted-foreground">Field Work MS</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Modul</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItems(modules)}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={printActive}
                  tooltip="Cetak Laporan"
                  onClick={() => setPrintOpen((v) => !v)}
                >
                  <Printer />
                  <span>Cetak Laporan</span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${
                      printOpen ? "rotate-90" : ""
                    }`}
                  />
                </SidebarMenuButton>
                {printOpen ? (
                  <SidebarMenuSub>
                    {printSubNav.map((s) => {
                      const active = location.pathname === s.to;
                      const Icon = s.icon;
                      return (
                        <SidebarMenuSubItem key={s.to}>
                          <SidebarMenuSubButton asChild isActive={active}>
                            <Link to={s.to}>
                              <Icon />
                              <span>{s.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {renderItems([
                  { label: "Pengguna", to: "/dashboard/users", icon: UserCog },
                ])}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Sistem</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(systemNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.4.0 · Phase 6
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
