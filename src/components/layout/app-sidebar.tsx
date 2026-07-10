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
} from "@/components/ui/sidebar";

const mainNav = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
];

const placeholderNav = [
  { label: "Penugasan", to: "/dashboard", icon: ClipboardList },
  { label: "Petugas Lapangan", to: "/dashboard", icon: Users },
  { label: "Lokasi", to: "/dashboard", icon: MapPin },
  { label: "Kendaraan", to: "/dashboard", icon: Truck },
  { label: "Notifikasi", to: "/dashboard", icon: Bell },
];

const systemNav = [
  { label: "Pengaturan", to: "/dashboard", icon: Settings },
];

export function AppSidebar() {
  const { location } = useRouterState();

  const renderItems = (items: typeof mainNav) =>
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
            <SidebarMenu>{renderItems(placeholderNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Sistem</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(systemNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v0.1.0 · Phase 1
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
