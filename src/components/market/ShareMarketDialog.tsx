import { useEffect, useId, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useShareMarket, shareUrlForMarket } from "@/hooks/useShareMarket";
import { buildFacebookSharerUrl } from "@/lib/app-url";
import { useAuth } from "@/store/useAuth";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marketId: string;
  title: string;
  description?: string;
  affiliateRatePercent?: number;
};

export function ShareMarketDialog({
  open,
  onOpenChange,
  marketId,
  title,
  description,
  affiliateRatePercent = 0,
}: Props) {
  const { t } = useTranslation();
  const descId = useId();
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const triggerRef = useRef<HTMLElement | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: link, isLoading, isError } = useShareMarket(marketId, open && isLoggedIn);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const url = shareUrlForMarket(marketId, link, isLoggedIn);
  const rate = isLoggedIn
    ? (link?.affiliate_rate_percent ?? affiliateRatePercent)
    : affiliateRatePercent;
  const showEarn = isLoggedIn && rate > 0;

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("market.copyLinkSuccess"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("market.copyLink"));
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          ...(description ? { text: description } : {}),
          url,
        });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await copyUrl();
  };

  const shareOnFacebook = () => {
    window.open(buildFacebookSharerUrl(url), "_blank", "noopener,noreferrer,width=600,height=600");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && document.activeElement instanceof HTMLElement) {
          triggerRef.current = document.activeElement;
        }
        onOpenChange(next);
        if (!next && triggerRef.current) {
          requestAnimationFrame(() => triggerRef.current?.focus());
        }
      }}
    >
      <DialogContent className="sm:max-w-md" aria-describedby={descId} aria-busy={isLoading}>
        <DialogHeader>
          <DialogTitle>
            {showEarn ? t("market.shareEarn", { rate }) : t("market.shareTitle")}
          </DialogTitle>
          <DialogDescription id={descId}>
            {showEarn ? t("market.shareDesc") : t("market.shareTitle")}
          </DialogDescription>
        </DialogHeader>

        {isLoggedIn && isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("common.loading")}
          </div>
        ) : (
          <div className="space-y-4">
            {!isLoggedIn && (
              <p className="text-sm text-muted-foreground">
                {t("market.shareGuestHint")}{" "}
                <Link
                  to="/login"
                  search={{ redirect: `/markets/${marketId}` }}
                  className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {t("nav.login")}
                </Link>
              </p>
            )}

            {isLoggedIn && isError && (
              <p className="text-sm text-destructive" role="alert">
                {t("market.copyLink")}
              </p>
            )}

            <div className="space-y-2">
              <label htmlFor={`${descId}-url`} className="text-xs text-muted-foreground">
                {t("market.affiliateRateLabel")}
              </label>
              <div className="flex gap-2">
                <Input
                  id={`${descId}-url`}
                  readOnly
                  aria-readonly
                  value={url}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyUrl}
                  aria-label={t("market.copyLink")}
                  className="shrink-0 focus-visible:ring-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                  <span className="sr-only">{t("market.copyLink")}</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={copyUrl} className="focus-visible:ring-2">
                {t("market.copyLink")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={shareOnFacebook}
                className="focus-visible:ring-2"
              >
                {t("market.shareFacebook")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={nativeShare}
                className="focus-visible:ring-2"
              >
                <Share2 className="h-4 w-4 mr-2" aria-hidden />
                {t("market.shareNative")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
