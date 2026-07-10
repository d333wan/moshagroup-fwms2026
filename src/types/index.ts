export type UserRole =
  | "super_admin"
  | "admin"
  | "pemberi_tugas"
  | "supervisor"
  | "petugas_lapangan";

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface NavItem {
  label: string;
  to: string;
  icon?: React.ComponentType<{ className?: string }>;
}
