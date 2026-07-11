import { useEffect, useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
  redirect,
} from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { COMPANY_LOGO_URL, COMPANY_NAME } from "@/lib/company";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Masuk · FWMS" },
      { name: "description", content: "Masuk atau daftar ke FWMS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect: redirectTo } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: redirectTo ?? "/dashboard", replace: true });
    }
  }, [loading, user, redirectTo, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src={COMPANY_LOGO_URL} alt={COMPANY_NAME} className="h-10 w-auto" />
          <h1 className="text-2xl font-semibold tracking-tight">Masuk ke FWMS</h1>
          <p className="text-sm text-muted-foreground">
            Field Work Management System — {COMPANY_NAME}
          </p>
        </div>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Akses Akun</CardTitle>
          </CardHeader>
          <CardContent>
            <SignInForm />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Pendaftaran akun hanya dilakukan oleh Admin / Super Admin.
            </p>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline-offset-4 hover:underline">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Gagal masuk", { description: error.message });
      return;
    }
    toast.success("Berhasil masuk");
  };

  const handleReset = async () => {
    if (!email) {
      toast.error("Isi email dulu untuk reset password");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Link reset password sudah dikirim ke email Anda");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <PasswordInput
          id="signin-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Memproses…" : "Masuk"}
      </Button>
      <button
        type="button"
        onClick={handleReset}
        className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Lupa password?
      </button>
    </form>
  );
}



