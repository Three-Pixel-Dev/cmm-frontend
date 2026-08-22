import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/store/useAuth";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Log in — SuperCash" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const setUser = useAuth((s) => s.setUser);
  const isLoggedIn = useAuth((s) => s.isLoggedIn());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const guestNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoggedIn) navigate({ to: redirect || "/" });
  }, [isLoggedIn, navigate, redirect]);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const loginM = useMutation({
    mutationFn: () => authApi.login(email.trim(), password),
    onSuccess: (res) => {
      setUser(res.user);
      toast.success(t("login.welcome", { name: res.user.name }));
      navigate({ to: redirect || "/" });
    },
    onError: (e: Error) => setError(e.message),
  });

  const guestLoginM = useMutation({
    mutationFn: () => authApi.guestLogin(guestName.trim()),
    onSuccess: (res) => {
      setUser(res.user);
      toast.success(t("login.welcome", { name: res.user.name }));
      navigate({ to: redirect || "/" });
    },
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(t("login.errorRequired"));
      return;
    }
    loginM.mutate();
  };

  const submitGuest = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!guestName.trim()) {
      setError("Username is required");
      return;
    }
    guestLoginM.mutate();
  };

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo variant="full" className="justify-center" />
          <h1 className="text-2xl font-bold">{t("login.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="guest">Guest</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <form
              onSubmit={submit}
              className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6"
              noValidate
            >
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="login-email">{t("login.email")}</Label>
                <Input
                  id="login-email"
                  ref={emailRef}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">{t("login.password")}</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? t("login.hidePassword") : t("login.showPassword")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={loginM.isPending}>
                {loginM.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t("login.signingIn")}
                  </>
                ) : (
                  t("login.signIn")
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("login.noAccount")}{" "}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  {t("login.signUpLink")}
                </Link>
              </p>
            </form>
          </TabsContent>

          <TabsContent value="guest">
            <form
              onSubmit={submitGuest}
              className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6"
              noValidate
            >
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="guest-name">Username</Label>
                <Input
                  id="guest-name"
                  ref={guestNameRef}
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter a username"
                />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={guestLoginM.isPending}>
                {guestLoginM.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Joining...
                  </>
                ) : (
                  "Join as Guest"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
