import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Split, CheckCircle2, AlertCircle } from "lucide-react";
import { inr } from "@/lib/pms-data";

export type SplitRow = {
  id: string;
  method: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER";
  amount: number;
  reference_note?: string;
};

interface SplitPaymentInputProps {
  totalAmount: number;
  splits: SplitRow[];
  onChange: (splits: SplitRow[]) => void;
  disabled?: boolean;
}

export function SplitPaymentInput({
  totalAmount,
  splits,
  onChange,
  disabled = false,
}: SplitPaymentInputProps) {
  const splitTotal = splits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const remaining = Math.max(0, totalAmount - splitTotal);
  const isOverpaid = splitTotal > totalAmount;
  const isBalanced = splitTotal === totalAmount && totalAmount > 0;

  const handleAddSplit = (method: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER" = "CASH") => {
    const defaultAmount = remaining > 0 ? remaining : 0;
    const newRow: SplitRow = {
      id: crypto.randomUUID(),
      method,
      amount: defaultAmount,
      reference_note: "",
    };
    onChange([...splits, newRow]);
  };

  const handleRemoveSplit = (id: string) => {
    if (splits.length <= 1) {
      // Don't remove the last one; just reset it
      onChange([
        {
          id: crypto.randomUUID(),
          method: "CASH",
          amount: totalAmount,
          reference_note: "",
        },
      ]);
      return;
    }
    onChange(splits.filter((s) => s.id !== id));
  };

  const handleUpdateSplit = (id: string, updates: Partial<SplitRow>) => {
    onChange(
      splits.map((s) => {
        if (s.id !== id) return s;
        return { ...s, ...updates };
      })
    );
  };

  const handleFillRemaining = (id: string) => {
    const currentSumWithoutThis = splits
      .filter((s) => s.id !== id)
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const need = Math.max(0, totalAmount - currentSumWithoutThis);
    handleUpdateSplit(id, { amount: need });
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-card/60 p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brass/10 text-brass">
            <Split className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Split Payment Breakdown</h4>
            <p className="text-[11px] text-muted-foreground">
              Distribute bill across Cash, Card, UPI, or Bank Transfer
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold text-foreground">
            Total Due: <span className="font-mono text-brass">{inr(totalAmount)}</span>
          </div>
          <div className="text-[11px]">
            {isBalanced ? (
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> Fully Allocated
              </span>
            ) : isOverpaid ? (
              <span className="flex items-center gap-1 font-medium text-destructive">
                <AlertCircle className="size-3" /> Overallocated by {inr(splitTotal - totalAmount)}
              </span>
            ) : (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Remaining: {inr(remaining)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Split Rows */}
      <div className="space-y-2.5 pt-1">
        {splits.map((split, idx) => (
          <div
            key={split.id}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-lg border border-border/60 bg-background/80 p-2 text-xs"
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {idx + 1}
              </span>
              <div className="w-36">
                <Select
                  value={split.method}
                  onValueChange={(val: any) => handleUpdateSplit(split.id, { method: val })}
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8 text-xs bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Cash</SelectItem>
                    <SelectItem value="CARD">💳 Card / POS</SelectItem>
                    <SelectItem value="UPI">📱 UPI / GPay</SelectItem>
                    <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="OTHER">🔖 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  disabled={disabled}
                  value={split.amount || ""}
                  onChange={(e) =>
                    handleUpdateSplit(split.id, { amount: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0.00"
                  className="h-8 pl-6 text-xs font-mono font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="text"
                disabled={disabled}
                value={split.reference_note || ""}
                onChange={(e) => handleUpdateSplit(split.id, { reference_note: e.target.value })}
                placeholder="Ref note (e.g. Card last 4 / UTR)"
                className="h-8 text-xs flex-1 sm:w-44"
              />

              {remaining > 0 && split.amount < totalAmount && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  onClick={() => handleFillRemaining(split.id)}
                  title="Fill remaining balance into this mode"
                  className="h-8 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  +Fill Rem
                </Button>
              )}

              {splits.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={disabled}
                  onClick={() => handleRemoveSplit(split.id)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Another Mode & Quick Split Helpers */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => handleAddSplit(remaining > 0 ? "CARD" : "UPI")}
          className="h-7 rounded-lg border-dashed text-xs text-brass hover:bg-brass/10 hover:text-brass"
        >
          <Plus className="size-3 mr-1" /> Add Payment Method Split
        </Button>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Allocated:</span>
          <span className="font-mono font-semibold text-foreground">{inr(splitTotal)}</span>
          <span>of</span>
          <span className="font-mono font-semibold text-foreground">{inr(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}
