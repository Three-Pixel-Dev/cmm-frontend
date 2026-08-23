import { createFileRoute, Link } from "@tanstack/react-router";
import { cloneElement, isValidElement, useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NrcInput } from "@/components/settings/NrcInput";
import { ImageUploadField } from "@/components/p2p/ImageUploadField";
import { PaymentMethodMultiSelect } from "@/components/p2p/PaymentMethodMultiSelect";
import {
  INCOME_PREFERENCES,
  incomePreferenceLabel,
  paymentMethodsLabel,
} from "@/lib/p2p/applicationOptions";
import { paymentMethodTypesApi } from "@/lib/api/paymentMethodTypes";
import { p2pApi } from "@/lib/api/p2p";
import { P2P_ADMIN_URL } from "@/lib/app-url";
import type { ApiP2PApplication } from "@/lib/api/types";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/store/useAuth";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p2p/apply")({
  head: () => ({ meta: [{ title: "Apply as P2P Agent — SuperCash" }] }),
  component: P2PApplyPage,
});

const schema = z.object({
  phone_number: z.string().min(6).max(32),
  address: z.string().min(5).max(1024),
  nationality: z.string().max(64).optional(),
  nrc: z.string().max(128).optional(),
  passport: z.string().max(64).optional(),
  nrc_front_url: z.string().min(1),
  nrc_back_url: z.string().min(1),
  platform_purchase_payment_methods: z.array(z.string().uuid()).min(1),
  user_trade_payment_methods: z.array(z.string().uuid()).min(1),
  working_capital: z.coerce.number().positive(),
  previous_experience: z.string().min(1).max(5000),
  application_purpose: z.string().min(1).max(5000),
  income_preference: z.enum(["spread_only", "spread_and_affiliate"]),
  proposed_commission_rate: z.coerce.number().min(0.01).max(100),
  note: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;
type ApplyView =
  | "login"
  | "loading"
  | "error"
  | "agent"
  | "pending"
  | "approved"
  | "rejected"
  | "form";

function P2PApplyPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const profileQ = useProfile();

  const statusQ = useQuery({
    queryKey: ["p2p", "application", "me"],
    queryFn: () => p2pApi.getMyApplication(),
    enabled: isLoggedIn,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone_number: "",
      address: "",
      nationality: "",
      nrc: "",
      passport: "",
      nrc_front_url: "",
      nrc_back_url: "",
      platform_purchase_payment_methods: [] as FormValues["platform_purchase_payment_methods"],
      user_trade_payment_methods: [] as FormValues["user_trade_payment_methods"],
      working_capital: 0,
      previous_experience: "",
      application_purpose: "",
      income_preference: "" as FormValues["income_preference"],
      proposed_commission_rate: 1.5,
      note: "",
    },
  });

  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    if (p.phone_number) form.setValue("phone_number", p.phone_number);
    if (p.address) form.setValue("address", p.address);
    if (p.nationality) form.setValue("nationality", p.nationality);
    if (p.nrc) form.setValue("nrc", p.nrc);
    if (p.passport) form.setValue("passport", p.passport);
  }, [profileQ.data, form]);

  const submitM = useMutation({
    mutationFn: (values: FormValues) =>
      p2pApi.submitApplication({
        phone_number: values.phone_number,
        address: values.address,
        nationality: values.nationality || undefined,
        nrc: values.nrc || undefined,
        passport: values.passport || undefined,
        nrc_front_url: values.nrc_front_url,
        nrc_back_url: values.nrc_back_url,
        platform_purchase_payment_methods: values.platform_purchase_payment_methods,
        user_trade_payment_methods: values.user_trade_payment_methods,
        working_capital: String(values.working_capital),
        previous_experience: values.previous_experience,
        application_purpose: values.application_purpose,
        income_preference: values.income_preference,
        proposed_commission_rate: String(values.proposed_commission_rate),
        note: values.note || undefined,
      }),
    onSuccess: () => {
      toast.success(t("p2p.apply.success"));
      qc.invalidateQueries({ queryKey: ["p2p", "application", "me"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const app = statusQ.data?.application;
  const hasAgent = !!statusQ.data?.has_agent;
  const canApply =
    isLoggedIn &&
    !hasAgent &&
    (!app || app.status === "rejected" || (app.status === "approved" && !hasAgent));

  const view: ApplyView = !isLoggedIn
    ? "login"
    : statusQ.isLoading
      ? "loading"
      : statusQ.isError
        ? "error"
        : hasAgent
          ? "agent"
          : app?.status === "pending"
            ? "pending"
            : app?.status === "approved"
              ? "approved"
              : app?.status === "rejected"
                ? "rejected"
                : "form";

  const subtitleKey: Record<ApplyView, string> = {
    login: "p2p.apply.subtitleLogin",
    loading: "p2p.apply.subtitle",
    error: "p2p.apply.subtitle",
    agent: "p2p.apply.alreadyAgentDesc",
    pending: "p2p.apply.statusPendingDesc",
    approved: hasAgent ? "p2p.apply.alreadyAgentDesc" : "p2p.apply.statusApprovedSetupDesc",
    rejected: "p2p.apply.statusRejectedDesc",
    form: "p2p.apply.formIntro",
  };

  const agentDashboardAction = (
    <Button asChild className="w-full sm:w-auto">
      <a href={P2P_ADMIN_URL} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4" aria-hidden />
        {t("p2p.apply.openAgentDashboard")}
      </a>
    </Button>
  );

  const browseP2pAction = (
    <Button variant="outline" asChild className="w-full sm:w-auto">
      <Link to="/p2p">{t("p2p.apply.viewP2p")}</Link>
    </Button>
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10" aria-labelledby="p2p-apply-heading">
      <Link
        to="/p2p"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {t("p2p.apply.backToP2p")}
      </Link>

      <header className="mb-8 space-y-2">
        <h1 id="p2p-apply-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("p2p.apply.title")}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t(subtitleKey[view])}
        </p>
      </header>

      {view === "login" && (
        <StatusCard
          tone="neutral"
          icon={<Clock className="h-7 w-7" aria-hidden />}
          title={t("p2p.apply.loginRequired")}
          action={
            <Button asChild className="w-full sm:w-auto">
              <Link to="/login" search={{ redirect: "/p2p/apply" }}>
                {t("nav.login")}
              </Link>
            </Button>
          }
        />
      )}

      {view === "loading" && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-16"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
          <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
        </div>
      )}

      {view === "error" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" aria-hidden />
          <AlertTitle>{t("p2p.apply.loadErrorTitle")}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{(statusQ.error as Error).message || t("p2p.apply.loadError")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-destructive/30"
              onClick={() => statusQ.refetch()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {t("common.tryAgain")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {view === "agent" && (
        <StatusCard
          tone="success"
          badge={t("p2p.apply.statusBadge.active")}
          icon={<CheckCircle2 className="h-7 w-7" aria-hidden />}
          title={t("p2p.apply.alreadyAgentTitle")}
          description={t("p2p.apply.alreadyAgentDesc")}
          action={
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              {agentDashboardAction}
              {browseP2pAction}
            </div>
          }
        />
      )}

      {view === "pending" && app && (
        <div className="space-y-6">
          <StatusCard
            tone="pending"
            badge={t("p2p.apply.statusBadge.pending")}
            icon={<Clock className="h-7 w-7" aria-hidden />}
            title={t("p2p.apply.statusPendingTitle")}
            description={t("p2p.apply.statusPendingDesc")}
          />
          <ReviewTimeline />
          <ApplicationSummary app={app} locale={i18n.language} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">{browseP2pAction}</div>
        </div>
      )}

      {view === "approved" && app && (
        <div className="space-y-6">
          <StatusCard
            tone="success"
            badge={t("p2p.apply.statusBadge.approved")}
            icon={<CheckCircle2 className="h-7 w-7" aria-hidden />}
            title={t("p2p.apply.statusApprovedTitle")}
            description={
              hasAgent ? t("p2p.apply.statusApprovedDesc") : t("p2p.apply.statusApprovedSetupDesc")
            }
            action={
              hasAgent ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                  {agentDashboardAction}
                  {browseP2pAction}
                </div>
              ) : undefined
            }
          />
          <ApplicationSummary app={app} locale={i18n.language} />
        </div>
      )}

      {view === "rejected" && app && (
        <div className="space-y-6">
          <StatusCard
            tone="error"
            badge={t("p2p.apply.statusBadge.rejected")}
            icon={<XCircle className="h-7 w-7" aria-hidden />}
            title={t("p2p.apply.statusRejectedTitle")}
            description={t("p2p.apply.statusRejectedDesc")}
          />
          {app.reject_reason && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" aria-hidden />
              <AlertTitle>{t("p2p.apply.rejectReason")}</AlertTitle>
              <AlertDescription>{app.reject_reason}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {canApply && (
        <ApplyForm
          form={form}
          showReapplyHeading={app?.status === "rejected"}
          isPending={submitM.isPending}
          onSubmit={(v) => submitM.mutate(v)}
        />
      )}
    </main>
  );
}

function ReviewTimeline() {
  const { t } = useTranslation();
  const steps = [
    { label: t("p2p.apply.timelineSubmitted"), done: true, current: false },
    { label: t("p2p.apply.timelineReview"), done: false, current: true },
    { label: t("p2p.apply.timelineAccess"), done: false, current: false },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("p2p.apply.nextSteps")}</CardTitle>
        <CardDescription>{t("p2p.apply.statusPendingHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-0" aria-label={t("p2p.apply.nextSteps")}>
          {steps.map((step, i) => (
            <li key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                    step.done && "border-yes bg-yes/15 text-yes",
                    step.current && "border-amber-400 bg-amber-400/10 text-amber-400",
                    !step.done && !step.current && "border-border text-muted-foreground",
                  )}
                  aria-current={step.current ? "step" : undefined}
                >
                  {step.done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span
                    className={cn(
                      "my-1 w-0.5 flex-1 min-h-6",
                      step.done ? "bg-yes/40" : "bg-border",
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <div className="pb-6 pt-1.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.current
                      ? "text-foreground"
                      : step.done
                        ? "text-yes"
                        : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ApplicationSummary({ app, locale }: { app: ApiP2PApplication; locale: string }) {
  const { t } = useTranslation();
  const p2pTypesQ = useQuery({
    queryKey: ["payment-method-types", "p2p-labels"],
    queryFn: () => paymentMethodTypesApi.list({ for_p2p: true }),
  });
  const userTypesQ = useQuery({
    queryKey: ["payment-method-types", "user-labels"],
    queryFn: () => paymentMethodTypesApi.list(),
  });
  const p2pPaymentTypes = p2pTypesQ.data ?? [];
  const userPaymentTypes = userTypesQ.data ?? [];
  const rows = [
    { label: t("p2p.apply.submittedOn"), value: fmtDate(app.created_at, locale) },
    { label: t("p2p.apply.phone"), value: app.phone_number },
    {
      label: t("p2p.apply.platformPurchasePayment"),
      value: paymentMethodsLabel(app.platform_purchase_payment_methods, p2pPaymentTypes),
    },
    {
      label: t("p2p.apply.userTradePayment"),
      value: paymentMethodsLabel(app.user_trade_payment_methods, userPaymentTypes),
    },
    {
      label: t("p2p.apply.workingCapital"),
      value: app.working_capital ? Number(app.working_capital).toLocaleString(locale) : undefined,
    },
    { label: t("p2p.apply.incomePreference"), value: incomePreferenceLabel(app.income_preference) },
    { label: t("p2p.apply.proposedCommissionShort"), value: `${app.proposed_commission_rate}%` },
  ].filter((r) => r.value);

  const textBlocks = [
    { label: t("p2p.apply.previousExperience"), value: app.previous_experience },
    { label: t("p2p.apply.applicationPurpose"), value: app.application_purpose },
    { label: t("p2p.apply.note"), value: app.note },
  ].filter((r) => r.value);

  if (rows.length === 0 && textBlocks.length === 0 && !app.nrc_front_url && !app.nrc_back_url)
    return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("p2p.apply.applicationSummary")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map(({ label, value }) => (
              <div key={label} className="space-y-0.5">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </dt>
                <dd className="text-sm font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {textBlocks.map(({ label, value }) => (
          <div key={label} className="space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
          </div>
        ))}
        {(app.nrc_front_url || app.nrc_back_url) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {app.nrc_front_url && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("p2p.apply.nrcFront")}
                </p>
                <a href={app.nrc_front_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={app.nrc_front_url}
                    alt={t("p2p.apply.nrcFront")}
                    className="h-24 w-full rounded-md border border-border/60 object-cover"
                  />
                </a>
              </div>
            )}
            {app.nrc_back_url && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("p2p.apply.nrcBack")}
                </p>
                <a href={app.nrc_back_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={app.nrc_back_url}
                    alt={t("p2p.apply.nrcBack")}
                    className="h-24 w-full rounded-md border border-border/60 object-cover"
                  />
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCard({
  tone,
  badge,
  icon,
  title,
  description,
  action,
}: {
  tone: "neutral" | "pending" | "success" | "error";
  badge?: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const toneStyles = {
    neutral: "border-border/60 bg-card",
    pending: "border-amber-400/30 bg-amber-400/5",
    success: "border-yes/30 bg-yes/5",
    error: "border-no/30 bg-no/5",
  };
  const iconStyles = {
    neutral: "bg-muted text-muted-foreground",
    pending: "bg-amber-400/15 text-amber-400",
    success: "bg-yes/15 text-yes",
    error: "bg-no/15 text-no",
  };

  return (
    <Card className={cn("text-center", toneStyles[tone])} role="status" aria-live="polite">
      <CardHeader className="items-center space-y-4 pb-2">
        {badge && (
          <Badge
            variant="outline"
            className={cn(
              "mx-auto",
              tone === "pending" && "border-amber-400/50 text-amber-400",
              tone === "success" && "border-yes/50 text-yes",
              tone === "error" && "border-no/50 text-no",
            )}
          >
            {badge}
          </Badge>
        )}
        <div
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-full",
            iconStyles[tone],
          )}
          aria-hidden
        >
          {icon}
        </div>
        <div className="space-y-2">
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          {description && (
            <CardDescription className="mx-auto max-w-md text-sm leading-relaxed">
              {description}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      {action && <CardFooter className="justify-center pt-2">{action}</CardFooter>}
    </Card>
  );
}

function ApplyForm({
  form,
  showReapplyHeading,
  isPending,
  onSubmit,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  showReapplyHeading: boolean;
  isPending: boolean;
  onSubmit: (values: FormValues) => void;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const contactSectionId = `${formId}-contact`;
  const verificationSectionId = `${formId}-verification`;
  const paymentSectionId = `${formId}-payment`;
  const commissionHelpId = `${formId}-commission-help`;
  const p2pTypesQ = useQuery({
    queryKey: ["payment-method-types", "p2p"],
    queryFn: () => paymentMethodTypesApi.list({ for_p2p: true }),
  });
  const userTypesQ = useQuery({
    queryKey: ["payment-method-types", "user"],
    queryFn: () => paymentMethodTypesApi.list(),
  });
  const p2pPaymentTypes = p2pTypesQ.data ?? [];
  const userPaymentTypes = userTypesQ.data ?? [];

  return (
    <Card className="mt-6">
      <CardHeader>
        {showReapplyHeading && (
          <CardTitle className="text-base">{t("p2p.apply.applyAgain")}</CardTitle>
        )}
        {!showReapplyHeading && (
          <>
            <CardTitle className="text-base">{t("p2p.apply.contactSection")}</CardTitle>
            <CardDescription>{t("p2p.apply.formIntro")}</CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <fieldset className="space-y-4" aria-labelledby={contactSectionId}>
            <legend id={contactSectionId} className="sr-only">
              {t("p2p.apply.contactSection")}
            </legend>
            <Field
              id={`${formId}-phone`}
              label={t("p2p.apply.phone")}
              required
              error={form.formState.errors.phone_number?.message}
            >
              <Input
                type="tel"
                autoComplete="tel"
                aria-required="true"
                aria-invalid={!!form.formState.errors.phone_number}
                {...form.register("phone_number")}
              />
            </Field>
            <Field
              id={`${formId}-address`}
              label={t("p2p.apply.address")}
              required
              error={form.formState.errors.address?.message}
            >
              <Textarea
                rows={2}
                autoComplete="street-address"
                aria-required="true"
                aria-invalid={!!form.formState.errors.address}
                {...form.register("address")}
              />
            </Field>
            <Field
              id={`${formId}-nationality`}
              label={t("p2p.apply.nationality")}
              error={form.formState.errors.nationality?.message}
            >
              <Input
                autoComplete="country-name"
                aria-invalid={!!form.formState.errors.nationality}
                {...form.register("nationality")}
              />
            </Field>
            <Field
              id={`${formId}-nrc`}
              label={t("p2p.apply.nrc")}
              error={form.formState.errors.nrc?.message}
            >
              <Controller
                name="nrc"
                control={form.control}
                render={({ field }) => (
                  <NrcInput
                    id={`${formId}-nrc`}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </Field>
            <Field
              id={`${formId}-passport`}
              label={t("p2p.apply.passport")}
              error={form.formState.errors.passport?.message}
            >
              <Input
                autoComplete="off"
                aria-invalid={!!form.formState.errors.passport}
                {...form.register("passport")}
              />
            </Field>
          </fieldset>

          <Separator />

          <fieldset className="space-y-4" aria-labelledby={verificationSectionId}>
            <legend id={verificationSectionId} className="text-sm font-medium text-foreground">
              {t("p2p.apply.nrcVerification")}
            </legend>
            <Alert>
              <AlertDescription>{t("p2p.apply.nrcNameHint")}</AlertDescription>
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="nrc_front_url"
                control={form.control}
                render={({ field }) => (
                  <div className="space-y-1">
                    <ImageUploadField
                      label={t("p2p.apply.nrcFront")}
                      hint={t("p2p.apply.uploadHint")}
                      previewAlt={t("p2p.apply.nrcFront")}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                    />
                    {form.formState.errors.nrc_front_url && (
                      <p className="text-xs text-destructive" role="alert">
                        {form.formState.errors.nrc_front_url.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <Controller
                name="nrc_back_url"
                control={form.control}
                render={({ field }) => (
                  <div className="space-y-1">
                    <ImageUploadField
                      label={t("p2p.apply.nrcBack")}
                      hint={t("p2p.apply.uploadHint")}
                      previewAlt={t("p2p.apply.nrcBack")}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                    />
                    {form.formState.errors.nrc_back_url && (
                      <p className="text-xs text-destructive" role="alert">
                        {form.formState.errors.nrc_back_url.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </fieldset>

          <Separator />

          <fieldset className="space-y-4" aria-labelledby={paymentSectionId}>
            <legend id={paymentSectionId} className="text-sm font-medium text-foreground">
              {t("p2p.apply.platformPurchasePayment")}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id={`${formId}-platform-payment`}
                label={t("p2p.apply.platformPurchasePayment")}
                required
                error={form.formState.errors.platform_purchase_payment_methods?.message}
              >
                <Controller
                  name="platform_purchase_payment_methods"
                  control={form.control}
                  render={({ field }) => (
                    <PaymentMethodMultiSelect
                      id={`${formId}-platform-payment`}
                      options={p2pPaymentTypes}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                      emptyLabel={t("p2p.apply.noP2pPaymentTypes")}
                    />
                  )}
                />
              </Field>
              <Field
                id={`${formId}-trade-payment`}
                label={t("p2p.apply.userTradePayment")}
                required
                error={form.formState.errors.user_trade_payment_methods?.message}
              >
                <Controller
                  name="user_trade_payment_methods"
                  control={form.control}
                  render={({ field }) => (
                    <PaymentMethodMultiSelect
                      id={`${formId}-trade-payment`}
                      options={userPaymentTypes}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isPending}
                      emptyLabel={t("p2p.apply.noUserPaymentTypes")}
                    />
                  )}
                />
              </Field>
            </div>
            <Field
              id={`${formId}-capital`}
              label={t("p2p.apply.workingCapital")}
              required
              hint={t("p2p.apply.workingCapitalHelp")}
              error={form.formState.errors.working_capital?.message}
            >
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                aria-required="true"
                aria-invalid={!!form.formState.errors.working_capital}
                {...form.register("working_capital")}
              />
            </Field>
          </fieldset>

          <Separator />

          <Field
            id={`${formId}-experience`}
            label={t("p2p.apply.previousExperience")}
            required
            hint={t("p2p.apply.previousExperienceHelp")}
            error={form.formState.errors.previous_experience?.message}
          >
            <Textarea
              rows={3}
              aria-required="true"
              aria-invalid={!!form.formState.errors.previous_experience}
              {...form.register("previous_experience")}
            />
          </Field>
          <Field
            id={`${formId}-purpose`}
            label={t("p2p.apply.applicationPurpose")}
            required
            error={form.formState.errors.application_purpose?.message}
          >
            <Textarea
              rows={3}
              aria-required="true"
              aria-invalid={!!form.formState.errors.application_purpose}
              {...form.register("application_purpose")}
            />
          </Field>
          <Field
            id={`${formId}-income`}
            label={t("p2p.apply.incomePreference")}
            required
            error={form.formState.errors.income_preference?.message}
          >
            <Controller
              name="income_preference"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="gap-3"
                  aria-required="true"
                >
                  {INCOME_PREFERENCES.map((opt) => (
                    <label
                      key={opt.value}
                      htmlFor={`${formId}-income-${opt.value}`}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/30 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                    >
                      <RadioGroupItem value={opt.value} id={`${formId}-income-${opt.value}`} />
                      <span className="text-sm">{t(opt.labelKey)}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          </Field>

          <Separator />

          <Field
            id={`${formId}-commission`}
            label={t("p2p.apply.proposedCommission")}
            required
            hint={t("p2p.apply.commissionHelp")}
            hintId={commissionHelpId}
            error={form.formState.errors.proposed_commission_rate?.message}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max="100"
              aria-required="true"
              aria-invalid={!!form.formState.errors.proposed_commission_rate}
              {...form.register("proposed_commission_rate")}
            />
          </Field>
          <Field
            id={`${formId}-note`}
            label={t("p2p.apply.note")}
            error={form.formState.errors.note?.message}
          >
            <Textarea
              rows={3}
              aria-invalid={!!form.formState.errors.note}
              {...form.register("note")}
            />
          </Field>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          type="submit"
          form={formId}
          className="w-full font-semibold sm:w-auto sm:min-w-[200px]"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("p2p.apply.submitting")}
            </>
          ) : (
            t("p2p.apply.submit")
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  hintId,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  hintId?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const describedBy = [hintId, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-foreground">
        {label}
        {required && (
          <>
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </Label>
      {hint && hintId && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {isValidElement(children)
        ? cloneElement(
            children as React.ReactElement<{ id?: string; "aria-describedby"?: string }>,
            {
              id,
              "aria-describedby": describedBy,
            },
          )
        : children}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
