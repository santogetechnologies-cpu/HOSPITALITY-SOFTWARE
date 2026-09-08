import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { usePms } from '@/lib/pms-store'
import { inr, EXPENSE_CATEGORIES } from '@/lib/pms-data'
import { toast } from 'sonner'
import {
  Receipt,
  Plus,
  Sparkles,
  Calendar,
  Filter,
  DollarSign,
  UserCheck,
  Search,
  Wallet,
  Clock
} from 'lucide-react'

export const Route = createFileRoute('/_shell/expenses')({
  head: () => ({
    meta: [
      { title: "Expenses & Petty Cash — Hotel DRB" },
      { name: "description", content: "Expense ledger, daily payouts, salary advance filtering, and petty cash control." },
    ],
  }),
  component: ExpensesPage,
})

type TimeFilter = "DAY" | "WEEK" | "MONTH" | "ALL" | "CUSTOM";

export function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, cleanDuplicateExpenses, session } = usePms();
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;

  const [open, setOpen] = React.useState(false);
  const [cleaning, setCleaning] = React.useState(false);
  
  // New Expense form state
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState("Salary Advance");
  const [description, setDescription] = React.useState("");
  const [expenseLoading, setExpenseLoading] = React.useState(false);

  // Filters State
  const todayStr = new Date().toISOString().split("T")[0];
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("MONTH");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [customStartDate, setCustomStartDate] = React.useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = React.useState<string>(todayStr);

  // Date Range Calculation
  const { startDate, endDate, dateRangeLabel } = React.useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    let label = "All Time";

    if (timeFilter === "DAY") {
      label = "Today";
    } else if (timeFilter === "WEEK") {
      start.setDate(start.getDate() - 6);
      label = "Last 7 Days";
    } else if (timeFilter === "MONTH") {
      start.setDate(1); // 1st of current month
      label = "Current Month";
    } else if (timeFilter === "ALL") {
      start.setFullYear(2020, 0, 1);
      label = "All Time";
    } else if (timeFilter === "CUSTOM") {
      if (customStartDate) {
        const s = new Date(`${customStartDate}T00:00:00`);
        if (!isNaN(s.getTime())) start.setTime(s.getTime());
      }
      if (customEndDate) {
        const e = new Date(`${customEndDate}T23:59:59`);
        if (!isNaN(e.getTime())) end.setTime(e.getTime());
      }
      label = `${customStartDate} to ${customEndDate}`;
    }

    return { startDate: start, endDate: end, dateRangeLabel: label };
  }, [timeFilter, customStartDate, customEndDate]);

  // Filtered Expenses
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      // 1. Time filter
      if (timeFilter !== "ALL") {
        const expDate = e.created_at ? new Date(e.created_at) : new Date();
        if (expDate < startDate || expDate > endDate) return false;
      }

      // 2. Category filter
      if (categoryFilter !== "all" && e.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const descMatch = e.description?.toLowerCase().includes(q);
        const catMatch = e.category?.toLowerCase().includes(q);
        const byMatch = e.recorded_by?.toLowerCase().includes(q);
        if (!descMatch && !catMatch && !byMatch) return false;
      }

      return true;
    });
  }, [expenses, timeFilter, categoryFilter, searchQuery, startDate, endDate]);

  // Financial Metrics
  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  // Specifically track Salary Advance payouts
  const salaryAdvanceAmount = filteredExpenses
    .filter((e) => e.category?.toLowerCase() === "salary advance" || e.description?.toLowerCase().includes("salary"))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const operationalAmount = filteredExpenses
    .filter((e) => e.category?.toLowerCase() === "operational" || e.category?.toLowerCase() === "maintenance")
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleCleanDuplicates = async () => {
    if (cleaning) return;
    setCleaning(true);
    try {
      const res = await cleanDuplicateExpenses();
      if (res?.success) toast.success("Duplicate expenses cleaned successfully!");
      else toast.error(res?.error || "Failed to clean duplicates");
    } finally {
      setCleaning(false);
    }
  };

  const handleExpenseSubmit = async () => {
    if (expenseLoading) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please provide an expense description (e.g. Employee name for Salary Advance, or item detail).");
      return;
    }

    setExpenseLoading(true);
    try {
      const res = await addExpense(amt, category, description.trim());
      if (res?.success) {
        toast.success(`Expense record of ${inr(amt)} for ${category} logged successfully.`);
        setOpen(false);
        setAmount("");
        setDescription("");
      } else {
        toast.error(res?.error || "Failed to log expense");
      }
    } finally {
      setExpenseLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Expenses & Petty Cash" 
        subtitle="Track operational costs, supplies, and staff salary advance payouts"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={cleaning}
              className="rounded-xl border-border bg-card/80 text-xs font-medium text-muted-foreground hover:text-foreground shadow-xs"
              onClick={handleCleanDuplicates}
            >
              <Sparkles className="size-3.5 mr-1.5 text-brass" />
              {cleaning ? "Cleaning..." : "Clean Duplicates"}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-sm text-xs font-medium">
                  <Plus className="size-4 mr-1.5" /> Log Expense / Advance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Receipt className="size-5 text-brass" /> Log Expense / Advance
                  </DialogTitle>
                  <DialogDescription>Record petty cash disbursement or staff salary advance.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Salary Advance">💼 Salary Advance (Staff Payout)</SelectItem>
                        <SelectItem value="Operational">⚙️ Operational Costs</SelectItem>
                        <SelectItem value="Inventory / Supplies">📦 Inventory / Supplies</SelectItem>
                        <SelectItem value="Maintenance">🔧 Maintenance & Repair</SelectItem>
                        <SelectItem value="F&B Supplies">🍽️ F&B Supplies</SelectItem>
                        <SelectItem value="Refund">↩️ Guest Refund</SelectItem>
                        <SelectItem value="Other">🔖 Other Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Amount (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">₹</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-7 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Description {category === "Salary Advance" ? "(Staff Member / Month)" : ""}
                    </Label>
                    <Input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        category === "Salary Advance"
                          ? "e.g. Ramesh K. (Housekeeping) - Advance for August"
                          : "e.g. Plumber fee, Milk packets, AC gas refill"
                      }
                      className="text-xs"
                    />
                  </div>

                  <Button 
                    disabled={expenseLoading}
                    className="w-full bg-brass text-gold-foreground hover:opacity-90 font-medium text-xs mt-2"
                    onClick={handleExpenseSubmit}
                  >
                    {expenseLoading ? "Saving..." : "Save Expense Record"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label={`Total Expenses (${dateRangeLabel})`}
          value={inr(totalFilteredAmount)}
          sub={`${filteredExpenses.length} total entries recorded`}
          icon={Receipt}
        />
        <div className="rounded-2xl border border-amber-500/30 bg-card p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Salary Advance Payouts</span>
            <div className="flex size-7 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {inr(salaryAdvanceAmount)}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Total staff advance sent in selected period
          </div>
        </div>
        <KpiCard
          label="Operations & Maintenance"
          value={inr(operationalAmount)}
          sub="Property running & upkeep costs"
          icon={DollarSign}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Time Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
              <Clock className="size-3.5" /> Time:
            </span>
            {(["DAY", "WEEK", "MONTH", "ALL", "CUSTOM"] as TimeFilter[]).map((tf) => (
              <Button
                key={tf}
                size="sm"
                variant={timeFilter === tf ? "default" : "outline"}
                onClick={() => setTimeFilter(tf)}
                className={`h-7 px-3 text-xs rounded-lg font-medium transition-all ${
                  timeFilter === tf
                    ? "bg-brass text-gold-foreground hover:opacity-90"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tf === "DAY" ? "Today" : tf === "WEEK" ? "This Week" : tf === "MONTH" ? "This Month" : tf === "ALL" ? "All Time" : "Custom Range"}
              </Button>
            ))}
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Filter className="size-3.5" /> Category:
            </span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 h-8 text-xs bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌟 All Categories</SelectItem>
                <SelectItem value="Salary Advance" className="font-semibold text-amber-600 dark:text-amber-400">
                  💼 Salary Advance
                </SelectItem>
                <SelectItem value="Operational">⚙️ Operational</SelectItem>
                <SelectItem value="Inventory / Supplies">📦 Inventory / Supplies</SelectItem>
                <SelectItem value="Maintenance">🔧 Maintenance</SelectItem>
                <SelectItem value="F&B Supplies">🍽️ F&B Supplies</SelectItem>
                <SelectItem value="Refund">↩️ Refund</SelectItem>
                <SelectItem value="Other">🔖 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Date Pickers when CUSTOM is active */}
        {timeFilter === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">From Date:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">To Date:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <Badge variant="outline" className="text-[11px] font-medium text-brass">
              Active: {customStartDate} to {customEndDate}
            </Badge>
          </div>
        )}

        {/* Search Box & Quick stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div className="relative w-full sm:w-80">
            <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search description, employee name..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Showing <strong className="text-foreground font-mono">{filteredExpenses.length}</strong> of <strong className="text-foreground font-mono">{expenses.length}</strong> records
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader className="bg-muted/10">
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description / Beneficiary</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((e) => {
              const isSalaryAdvance = e.category?.toLowerCase() === "salary advance";
              const isInventory = e.category === "Inventory / Supplies" || e.description?.includes("Inventory") || e.description?.includes("Initial Stock");

              return (
                <TableRow key={e.id} className={isSalaryAdvance ? "bg-amber-500/[0.03]" : ""}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {e.created_at ? new Date(e.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : "Just now"}
                  </TableCell>
                  <TableCell>
                    {isSalaryAdvance ? (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold">
                        💼 Salary Advance
                      </Badge>
                    ) : (
                      <Pill tone={isInventory ? "success" : "info"}>{e.category}</Pill>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-xs">{e.description}</span>
                      {isInventory && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          From Inventory
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.recorded_by}</TableCell>
                  <TableCell className="font-semibold font-mono text-destructive text-sm whitespace-nowrap">
                    - {inr(e.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 text-xs"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete expense "${e.description}" (-${inr(e.amount)})?`)) {
                            const delRes = await deleteExpense(e.id);
                            if (delRes?.success) toast.success("Expense deleted");
                            else toast.error(delRes?.error || "Failed to delete expense");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!filteredExpenses.length && (
          <div className="p-8">
            <EmptyState
              title="No expenses match current filters"
              body="Try choosing a different time range or category."
              icon={Receipt}
            />
          </div>
        )}
      </Panel>
    </div>
  )
}
