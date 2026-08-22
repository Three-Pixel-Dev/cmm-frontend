import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authApi } from "@/lib/api/auth";
import { profileApi } from "@/lib/api/profile";
import { OtpInput } from "@/components/auth/OtpInput";
import { NrcInput } from "@/components/settings/NrcInput";
import { PhoneInput } from "@/components/settings/PhoneInput";
import { BirthDateInput } from "@/components/settings/BirthDateInput";
import { isValidBirthDate } from "@/lib/birthDate";
import { maskEmail } from "@/lib/format";
import { useAuth } from "@/store/useAuth";
import { cn } from "@/lib/utils";
import { PROFILE_QUERY_KEY } from "@/hooks/useProfile";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — SuperCash" }] }),
  component: RegisterPage,
});

type Step = "account" | "verify" | "profile";

function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState<string | null>(null);

  // Step 1 — account (users table)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Step 2 — OTP
  const [otp, setOtp] = useState("");

  // Step 3 — profile (profiles table)
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [nrc, setNrc] = useState("");
  const [passport, setPassport] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");

  const requestM = useMutation({
    mutationFn: () => authApi.registerRequest({ name: name.trim(), email: email.trim(), password }),
    onSuccess: (res) => {
      setStep("verify");
      if (res.otp) toast.message(`OTP (debug): ${res.otp}`);
      else toast.success(t("login.otpSent"));
    },
    onError: (e: Error) => setError(e.message),
  });

  const verifyM = useMutation({
    mutationFn: (code: string) => authApi.registerVerify(email.trim(), code.trim()),
    onSuccess: (res) => {
      setUser(res.user);
      setStep("profile");
      toast.success(t("login.accountCreated"));
    },
    onError: (e: Error) => setError(e.message),
  });

  const resendM = useMutation({
    mutationFn: () => authApi.registerResend(email.trim()),
    onSuccess: (res) => {
      if (res.otp) toast.message(`OTP (debug): ${res.otp}`);
      else toast.success(t("login.otpSent"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const profileM = useMutation({
    mutationFn: () => {
      if (dateOfBirth && !isValidBirthDate(dateOfBirth)) {
        throw new Error(t("settings.birthDateInvalid"));
      }
      return profileApi.upsertMine({
        date_of_birth: dateOfBirth || undefined,
        gender: gender || undefined,
        phone_number: phone || undefined,
        nrc: nrc || undefined,
        passport: passport || undefined,
        address: address || undefined,
        nationality: nationality || undefined,
      });
    },
    onSuccess: (profile) => {
      qc.setQueryData(PROFILE_QUERY_KEY, profile);
      toast.success(t("settings.profileSaved"));
      navigate({ to: "/" });
    },
    onError: (e: Error) => setError(e.message),
  });

  useEffect(() => setError(null), [step]);

  const submitAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError(t("login.errorRequired"));
      return;
    }
    if (password.length < 8) {
      setError(t("login.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("login.passwordMismatch"));
      return;
    }
    requestM.mutate();
  };

  const submitVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.trim().length !== 6) {
      setError(t("login.otpInvalid"));
      return;
    }
    verifyM.mutate(otp.trim());
  };

  const steps: { key: Step; label: string }[] = [
    { key: "account", label: t("login.stepAccount") },
    { key: "verify", label: t("login.stepVerify") },
    { key: "profile", label: t("login.stepProfile") },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo variant="full" className="justify-center" />
          <h1 className="text-2xl font-bold">{t("login.registerTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("login.registerSubtitle")}</p>
        </div>

        {/* Stepper */}
        <ol className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  i < currentIndex && "bg-primary text-primary-foreground",
                  i === currentIndex && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  i > currentIndex && "bg-elevated text-muted-foreground",
                )}
              >
                {i < currentIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  i === currentIndex ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && <span className="h-px w-5 bg-border" />}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {step === "account" && (
            <form onSubmit={submitAccount} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">{t("login.name")}</Label>
                <Input
                  id="reg-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("login.namePlaceholder")}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">{t("login.email")}</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  autoComplete="email"
                  aria-describedby="reg-email-hint"
                />
                <p id="reg-email-hint" className="text-xs leading-relaxed text-muted-foreground">
                  {t("login.emailHint")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">{t("login.password")}</Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    autoComplete="new-password"
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
              <div className="space-y-1.5">
                <Label htmlFor="reg-confirm">{t("login.confirmPassword")}</Label>
                <Input
                  id="reg-confirm"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full font-semibold" disabled={requestM.isPending}>
                {requestM.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("login.sending")}
                  </>
                ) : (
                  t("login.continue")
                )}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("login.haveAccount")}{" "}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  {t("login.signInLink")}
                </Link>
              </p>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={submitVerify} className="space-y-4" noValidate>
              <p className="text-sm text-muted-foreground">
                {t("login.otpSubtitle", {
                  email: maskEmail(email),
                })}
                <span className="sr-only">{email}</span>
              </p>
              <OtpInput
                id="reg-otp"
                value={otp}
                onChange={setOtp}
                autoFocus
                invalid={!!error}
                disabled={verifyM.isPending}
                onComplete={(code) => {
                  setError(null);
                  verifyM.mutate(code);
                }}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full font-semibold" disabled={verifyM.isPending}>
                {verifyM.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("login.verifying")}
                  </>
                ) : (
                  t("login.verify")
                )}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep("account")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("login.back")}
                </button>
                <button
                  type="button"
                  onClick={() => resendM.mutate()}
                  disabled={resendM.isPending}
                  className="font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {t("login.resend")}
                </button>
              </div>
            </form>
          )}

          {step === "profile" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                profileM.mutate();
              }}
              className="space-y-4"
              noValidate
            >
              <p className="text-sm text-muted-foreground">{t("login.onboardingSubtitle")}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="reg-dob">{t("settings.dateOfBirth")}</Label>
                  <BirthDateInput id="reg-dob" value={dateOfBirth} onChange={setDateOfBirth} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("settings.gender")}</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("settings.genderPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t("settings.male")}</SelectItem>
                      <SelectItem value="female">{t("settings.female")}</SelectItem>
                      <SelectItem value="other">{t("settings.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-phone">{t("settings.phone")}</Label>
                <PhoneInput id="reg-phone" value={phone} onChange={setPhone} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-passport">{t("settings.passport")}</Label>
                <Input
                  id="reg-passport"
                  value={passport}
                  onChange={(e) => setPassport(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-nrc-state">{t("settings.nrc")}</Label>
                <NrcInput id="reg-nrc-state" value={nrc} onChange={setNrc} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.nationality")}</Label>
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("settings.nationalityPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYANMAR">{t("settings.myanmar")}</SelectItem>
                    <SelectItem value="OTHERS">{t("settings.others")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-address">{t("settings.address")}</Label>
                <Textarea
                  id="reg-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate({ to: "/" })}
                >
                  {t("login.skip")}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-semibold"
                  disabled={profileM.isPending}
                >
                  {profileM.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> {t("login.finishing")}
                    </>
                  ) : (
                    t("login.finish")
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
