import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/store/useAuth";

export const Route = createFileRoute("/host")({
  head: () => ({ meta: [{ title: "Host login — SuperCash" }] }),
  component: HostLoginPage,
});

function HostLoginPage() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const isHost = useAuth((s) => s.isHost());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn && isHost) navigate({ to: "/" });
  }, [isLoggedIn, isHost, navigate]);

  const loginM = useMutation({
    mutationFn: () => authApi.codeLogin(code.trim()),
    onSuccess: (res) => {
      setUser(res.user);
      toast.success(`Welcome, ${res.user.name}`);
      navigate({ to: "/" });
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Enter the access code from Superadmin.");
      return;
    }
    loginM.mutate();
  };

  return (
    <main className="game-shell">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo variant="full" className="justify-center" />
          <h1 className="text-3xl font-bold tracking-wide">Host access</h1>
          <p className="text-sm text-muted-foreground">
            Superadmin issues a code. First use creates your host account.
          </p>
        </div>
        <form
          onSubmit={submit}
          className="hud-panel space-y-4 rounded-2xl p-5 sm:p-6"
          noValidate
        >
          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="access-code">Access code</Label>
            <Input
              id="access-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoFocus
              autoCapitalize="characters"
              className="h-12 font-mono tracking-[0.24em] uppercase"
              placeholder="XXXXXXXX"
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={loginM.isPending}>
            {loginM.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Enter as host
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Playing instead?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Player login
          </Link>
        </p>
      </div>
    </main>
  );
}
