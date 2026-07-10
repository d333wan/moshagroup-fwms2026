import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ExternalLink, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import {
  COMPANY_LOGO_URL,
  COMPANY_NAME,
  COMPANY_WEBSITE,
} from "@/lib/company";


export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={COMPANY_LOGO_URL}
              alt={`${COMPANY_NAME} logo`}
              className="h-8 w-auto rounded-md"
            />
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold tracking-tight">FWMS</span>
              <span className="text-[10px] text-muted-foreground">
                {COMPANY_NAME}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" variant="outline">
              <a
                href={COMPANY_WEBSITE}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Website
              </a>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>
            © {new Date().getFullYear()} {COMPANY_NAME}
          </span>
          <a
            href={COMPANY_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Website Resmi
            <ExternalLink className="h-3 w-3" />
          </a>
          <span>Enterprise Edition · v0.1.0</span>
        </div>
      </footer>
    </div>
  );
}
