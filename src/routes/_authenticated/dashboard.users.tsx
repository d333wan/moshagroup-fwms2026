import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  KeyRound,
  UserCheck,
  UserX,
  Trash2,
} from "lucide-react";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import type { AppRole } from "@/lib/roles";
import {
  listUsers,
  createUser,
  updateUserProfile,
  setUserRole,
  deleteUser,
  adminResetPassword,
} from "@/lib/admin-users.functions";
import { Loading } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  petugas_lapangan: "Petugas Lapangan",
  guest: "Guest",
};

const ROLE_ORDER: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "petugas_lapangan",
  "guest",
];

export const Route = createFileRoute("/_authenticated/dashboard/users")({
  head: () => ({
    meta: [
      { title: "Manajemen Pengguna · FWMS" },
      { name: "description", content: "Kelola pengguna, role, dan status akun." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { isSuperAdmin, loading, user } = useAuth();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => listUsers(),
    enabled: isSuperAdmin,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

  const filtered = useMemo(() => {
    const rows = usersQuery.data ?? [];
    return rows.filter((u) => {
      const q = search.trim().toLowerCase();
      if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q))
        return false;
      if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
      if (statusFilter === "active" && !u.is_active) return false;
      if (statusFilter === "inactive" && u.is_active) return false;
      return true;
    });
  }, [usersQuery.data, search, roleFilter, statusFilter]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: AppRole }) => setUserRole({ data: v }),
    onSuccess: () => {
      toast.success("Role diperbarui");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profileMut = useMutation({
    mutationFn: (v: {
      user_id: string;
      is_active?: boolean;
      must_change_password?: boolean;
      full_name?: string;
    }) => updateUserProfile({ data: v }),
    onSuccess: () => {
      toast.success("Profil diperbarui");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser({ data: { user_id: id } }),
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <Loading />;

  if (!isSuperAdmin) {
    return (
      <DashboardLayout breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Pengguna" }]}>
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Akses ditolak</h2>
          <p className="text-sm text-muted-foreground">
            Hanya Super Admin yang dapat mengakses halaman ini.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Pengguna" }]}>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun, role, dan status aktivasi."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Tambah Pengguna
          </Button>
        }
      />

      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | "all")}>
              <SelectTrigger className="sm:w-48"><SelectValue placeholder="Semua Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {ROLE_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {usersQuery.isLoading ? (
            <Loading />
          ) : usersQuery.isError ? (
            <p className="p-6 text-sm text-destructive">{(usersQuery.error as Error).message}</p>
          ) : filtered.length === 0 ? (
            <EmptyState title="Tidak ada pengguna" description="Belum ada data pengguna yang cocok." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const isSelf = user?.id === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.full_name || "—"}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              Anda
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <Badge variant="outline">—</Badge>
                            ) : (
                              u.roles.map((r) => (
                                <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"}>
                                  {ROLE_LABELS[r as AppRole] ?? r}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "default" : "outline"}>
                            {u.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                          {u.must_change_password && (
                            <Badge variant="outline" className="ml-1">Wajib ganti pw</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Aksi pengguna">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ubah Role</DropdownMenuLabel>
                              {ROLE_ORDER.map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  disabled={u.roles.includes(r)}
                                  onClick={() => roleMut.mutate({ user_id: u.id, role: r })}
                                >
                                  {ROLE_LABELS[r]}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              {u.is_active ? (
                                <DropdownMenuItem
                                  disabled={isSelf}
                                  onClick={() =>
                                    profileMut.mutate({ user_id: u.id, is_active: false })
                                  }
                                >
                                  <UserX className="h-4 w-4" /> Nonaktifkan
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    profileMut.mutate({ user_id: u.id, is_active: true })
                                  }
                                >
                                  <UserCheck className="h-4 w-4" /> Aktifkan
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() =>
                                  profileMut.mutate({
                                    user_id: u.id,
                                    must_change_password: true,
                                  })
                                }
                              >
                                Wajibkan ganti password
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setResetTarget(u)}>
                                <KeyRound className="h-4 w-4" /> Reset password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isSelf}
                                onClick={() => setDeleteTarget(u)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" /> Hapus pengguna
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onDone={invalidate} />

      <ResetPasswordDialog
        target={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <b>{deleteTarget?.full_name || deleteTarget?.email}</b> akan dihapus permanen.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

type UserRow = Awaited<ReturnType<typeof listUsers>>[number];

function CreateUserDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("guest");
  const [mustChange, setMustChange] = useState(true);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEmail(""); setFullName(""); setPassword(""); setRole("guest"); setMustChange(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createUser({
        data: {
          email, password, full_name: fullName, role,
          is_active: true, must_change_password: mustChange,
        },
      });
      toast.success("Pengguna dibuat");
      onDone();
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna</DialogTitle>
          <DialogDescription>Akun langsung aktif dan email terverifikasi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-fullname">Nama Lengkap</Label>
            <Input id="new-fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Password Sementara</Label>
            <PasswordInput id="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <p className="text-xs text-muted-foreground">Minimal 8 karakter. Pengguna diminta ganti password saat login pertama.</p>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mustChange}
              onChange={(e) => setMustChange(e.target.checked)}
            />
            Wajibkan ganti password saat login pertama
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Buat Akun"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  target,
  onOpenChange,
}: {
  target: UserRow | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [requireChange, setRequireChange] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    try {
      await adminResetPassword({
        data: { user_id: target.id, new_password: password, require_change: requireChange },
      });
      toast.success("Password direset");
      setPassword("");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            {target?.full_name || target?.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-pw">Password baru</Label>
            <PasswordInput id="reset-pw" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requireChange} onChange={(e) => setRequireChange(e.target.checked)} />
            Wajibkan ganti password saat login berikutnya
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={busy}>{busy ? "Menyimpan…" : "Reset"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
