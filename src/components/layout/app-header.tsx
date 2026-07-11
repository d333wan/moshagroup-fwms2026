import { useEffect } from "react";
import { Bell, LogOut, User as UserIcon } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppBreadcrumb } from "@/components/common/app-breadcrumb";
import { useAuth } from "@/hooks/use-auth";
import { unreadCount } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import type { BreadcrumbItem } from "@/types";

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppHeader({ breadcrumbs }: AppHeaderProps) {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "User";

  const notif = useQuery({
    queryKey: ["notif-unread"],
    queryFn: () => unreadCount(),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notif-unread"] });
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    await signOut();
    navigate({ to: "/auth", replace: true });
    queryClient.clear();
  };

  const unread = notif.data?.count ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-border bg-card px-4 shadow-xs sm:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="hidden md:block">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <AppBreadcrumb items={breadcrumbs} />
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {roles.length > 0 && (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {roles[0]}
          </Badge>
        )}
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Notifikasi"
          className="relative"
        >
          <Link to="/dashboard/notifications">
            <Bell className="h-5 w-5" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initialsOf(displayName)}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                user &&
                navigate({
                  to: "/dashboard/officers/$userId",
                  params: { userId: user.id },
                })
              }
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
