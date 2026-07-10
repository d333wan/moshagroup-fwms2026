import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import type { BreadcrumbItem } from "@/types";

interface DashboardLayoutProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}

export function DashboardLayout({ children, breadcrumbs }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader breadcrumbs={breadcrumbs} />
        <main className="flex-1 bg-background px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
