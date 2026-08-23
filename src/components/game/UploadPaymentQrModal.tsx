import { useState, useRef } from "react";
import { Loader2, QrCode, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadFile } from "@/lib/api/files";
import { useUpdateMemberPaymentQr, useUpdateHostPaymentQr } from "@/hooks/useRooms";

const PAYMENT_PROVIDERS = [
  { id: "MMQR", label: "MMQR (National Standard / All Banks)" },
  { id: "KBZPay", label: "KBZPay (KPay)" },
  { id: "WavePay", label: "WavePay (Wave Money)" },
  { id: "CBPay", label: "CBPay / CB Bank" },
  { id: "AYAPay", label: "AYA Pay" },
  { id: "Other", label: "Other Bank / E-Wallet" },
];

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export interface PaymentQrFormValues {
  payment_type?: string;
  payment_account_name?: string;
  payment_account_number?: string;
  payment_qr_url?: string;
  payment_note?: string;
}

interface UploadPaymentQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  isHost?: boolean;
  initialValues?: PaymentQrFormValues;
}

export function UploadPaymentQrModal({
  open,
  onOpenChange,
  roomId,
  isHost = false,
  initialValues,
}: UploadPaymentQrModalProps) {
  const [paymentType, setPaymentType] = useState(initialValues?.payment_type || "MMQR");
  const [accountName, setAccountName] = useState(initialValues?.payment_account_name || "");
  const [accountNumber, setAccountNumber] = useState(initialValues?.payment_account_number || "");
  const [qrUrl, setQrUrl] = useState(initialValues?.payment_qr_url || "");
  const [paymentNote, setPaymentNote] = useState(initialValues?.payment_note || "");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMemberM = useUpdateMemberPaymentQr(roomId);
  const updateHostM = useUpdateHostPaymentQr(roomId);

  const isPending = updateMemberM.isPending || updateHostM.isPending || uploading;

  const handleFileChange = async (file: File | undefined | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please upload an image file (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be smaller than 10MB");
      return;
    }
    setUploading(true);
    try {
      const res = await uploadFile(file);
      setQrUrl(res.url);
      toast.success("QR code image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (isHost) {
      updateHostM.mutate(
        {
          host_payment_type: paymentType,
          host_payment_account_name: accountName.trim(),
          host_payment_account_number: accountNumber.trim(),
          host_payment_qr_url: qrUrl,
        },
        {
          onSuccess: () => {
            toast.success("Host payment QR updated");
            onOpenChange(false);
          },
          onError: (err: Error) => {
            toast.error(err.message);
          },
        },
      );
    } else {
      updateMemberM.mutate(
        {
          payment_type: paymentType,
          payment_account_name: accountName.trim(),
          payment_account_number: accountNumber.trim(),
          payment_qr_url: qrUrl,
          payment_note: paymentNote.trim(),
        },
        {
          onSuccess: () => {
            toast.success("Payment QR updated");
            onOpenChange(false);
          },
          onError: (err: Error) => {
            toast.error(err.message);
          },
        },
      );
    }
  };

  const handleClear = () => {
    setPaymentType("MMQR");
    setAccountName("");
    setAccountNumber("");
    setQrUrl("");
    setPaymentNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/15 bg-neutral-950/95 p-6 text-foreground backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                {isHost ? "Host Payment QR" : "My Payment QR (Payout Info)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {isHost
                  ? "Upload your QR code for players to pay entry fees and tabs"
                  : "Upload your MMQR / KPay QR so the room host can send your payouts"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Provider Dropdown */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Payment Provider / Method</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger className="border-white/10 bg-black/40">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent className="border-white/15 bg-neutral-950 text-foreground">
                {PAYMENT_PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* QR Image Dropzone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              QR Code Image <span className="font-normal text-muted-foreground">(Optional)</span>
            </Label>
            {qrUrl ? (
              <div className="relative flex flex-col items-center justify-center rounded-xl border border-white/15 bg-black/50 p-4">
                <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white p-2">
                  <img
                    src={qrUrl}
                    alt="Payment QR"
                    className="max-h-44 w-auto max-w-[200px] object-contain"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => setQrUrl("")}
                  className="mt-3 h-7 gap-1.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove Image
                </Button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    void handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                  dragging
                    ? "border-primary bg-primary/10"
                    : "border-white/15 bg-black/30 hover:border-white/30 hover:bg-black/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => void handleFileChange(e.target.files?.[0])}
                />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Uploading QR code...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="h-8 w-8 text-primary" />
                    <div className="text-xs font-semibold">Click or drag & drop QR code image</div>
                    <span className="text-[11px] text-muted-foreground">
                      PNG, JPG, WEBP up to 10MB
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Holder Name</Label>
              <Input
                placeholder="e.g. U Kyaw"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="border-white/10 bg-black/40 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Number / Phone</Label>
              <Input
                placeholder="e.g. 09123456789"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="border-white/10 bg-black/40 text-xs font-mono"
              />
            </div>
          </div>

          {/* Payment Note (Optional) */}
          {!isHost && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Transfer Note / Instructions <span className="font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                placeholder="e.g. KPay wallet only, no wave"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="border-white/10 bg-black/40 text-xs"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear / Leave blank
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save QR Info
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
