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
      <SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
        <AppHeader breadcrumbs={breadcrumbs} />
        <main className="min-w-0 max-w-full flex-1 overflow-x-hidden bg-background px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
