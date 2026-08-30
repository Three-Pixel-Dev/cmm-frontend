import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2, Loader2, Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { marketItemsApi } from "@/lib/api/markets";
import { ROOM_MARKETS_KEY } from "@/hooks/useRooms";
import type { ApiMarketItem } from "@/types/market-api";

export function EditQuestionDialog({
  open,
  onOpenChange,
  item,
  roomId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ApiMarketItem;
  roomId: string;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(item.title_en || "");
  const [criteria, setCriteria] = useState(item.resolution_criteria_en || "");
  const [optionTitles, setOptionTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    setTitle(item.title_en || "");
    setCriteria(item.resolution_criteria_en || "");
    const initialOpts: Record<string, string> = {};
    for (const opt of item.options ?? []) {
      initialOpts[opt.id] = opt.title_en || "";
    }
    setOptionTitles(initialOpts);
  }, [item, open]);

  const updateM = useMutation({
    mutationFn: async () => {
      const updatedOptions = (item.options ?? []).map((opt) => ({
        id: opt.id,
        title_en: optionTitles[opt.id]?.trim() || opt.title_en,
        sort_order: opt.sort_order,
      }));

      return marketItemsApi.update(item.id, {
        title_en: title.trim(),
        resolution_criteria_en: criteria.trim() || undefined,
        options: updatedOptions.length >= 2 ? updatedOptions : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Question updated successfully");
      void qc.invalidateQueries({ queryKey: [ROOM_MARKETS_KEY, roomId] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update question");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Question title cannot be empty");
      return;
    }
    updateM.mutate();
  };

  const isResolved = item.status === "settled" || item.status === "cancelled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Edit2 className="h-4 w-4 text-primary" />
            Edit Table Question
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isResolved
              ? "This question has already been resolved and cannot be edited."
              : "Update question details and option labels while betting is active."}
          </DialogDescription>
        </DialogHeader>

        {isResolved ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-sm font-semibold text-destructive">
            Resolved questions are permanently locked.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Question Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter question..."
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-criteria">Resolution Criteria (Optional)</Label>
              <Textarea
                id="edit-criteria"
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                placeholder="Details or rules for resolving..."
                rows={2}
                maxLength={1000}
              />
            </div>

            {item.options && item.options.length > 0 ? (
              <div className="space-y-2">
                <Label>Option Labels</Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {item.options.map((opt, idx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-5">
                        #{idx + 1}
                      </span>
                      <Input
                        value={optionTitles[opt.id] ?? opt.title_en}
                        onChange={(e) =>
                          setOptionTitles((prev) => ({
                            ...prev,
                            [opt.id]: e.target.value,
                          }))
                        }
                        className="h-8 text-xs"
                        placeholder={`Option ${idx + 1}`}
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="gap-1.5"
                disabled={updateM.isPending}
              >
                {updateM.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
