import { useState } from "react";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PaymentQrData {
  title?: string;
  userName?: string;
  paymentType?: string;
  accountName?: string;
  accountNumber?: string;
  qrUrl?: string;
  note?: string;
}

interface PaymentQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PaymentQrData | null;
}

export function PaymentQrDialog({ open, onOpenChange, data }: PaymentQrDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const copyAccount = async () => {
    if (!data.accountNumber) return;
    try {
      await navigator.clipboard.writeText(data.accountNumber);
      setCopied(true);
      toast.success("Account number copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy account number");
    }
  };

  const hasQr = !!data.qrUrl;
  const hasAccount = !!data.accountNumber || !!data.accountName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/15 bg-neutral-950/95 p-6 text-foreground backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {data.title || `${data.userName || "Player"}'s Payment QR`}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Scan QR or copy details to send payment/payout
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Provider Badge & User */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Payee</span>
              <span className="font-semibold text-sm">{data.userName || "Player"}</span>
            </div>
            {data.paymentType ? (
              <Badge variant="outline" className="border-primary/40 bg-primary/15 text-primary text-xs font-bold">
                {data.paymentType}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                QR Payment
              </Badge>
            )}
          </div>

          {/* QR Image Display */}
          {hasQr ? (
            <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/60 p-4 shadow-inner">
              <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white p-2.5 shadow-md">
                <img
                  src={data.qrUrl}
                  alt={`${data.paymentType || "Payment"} QR Code`}
                  className="max-h-64 w-auto max-w-[260px] object-contain transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <a
                href={data.qrUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                Open original image <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/30 py-8 text-center">
              <QrCode className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">No QR image attached</p>
            </div>
          )}

          {/* Account Details */}
          {hasAccount ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs">
              {data.accountName ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-semibold text-foreground">{data.accountName}</span>
                </div>
              ) : null}
              {data.accountNumber ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Account Number / Phone:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-primary">
                    <span>{data.accountNumber}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyAccount()}
                      className="h-6 w-6 p-0 hover:bg-white/10 text-muted-foreground hover:text-foreground"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Payment Note */}
          {data.note ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90">
              <span className="font-semibold text-amber-300">Note: </span>
              {data.note}
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
