import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { toast } from 'sonner'
import { Receipt, Plus } from 'lucide-react'

export const Route = createFileRoute('/_shell/expenses')({
  component: ExpensesPage,
})

function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, session } = usePms();
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;
  const [open, setOpen] = React.useState(false);
  
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState("Operational");
  const [description, setDescription] = React.useState("");
  const [expenseLoading, setExpenseLoading] = React.useState(false);

  const handleExpenseSubmit = async () => {
    if (expenseLoading) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please provide an expense description.");
      return;
    }

    setExpenseLoading(true);
    try {
      const res = await addExpense(amt, category, description.trim());
      if (res?.success) {
        toast.success("Expense record logged successfully.");
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
        subtitle="Log operational costs and daily payouts"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90">
                <Plus className="size-4 mr-2" /> Log Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log an Expense</DialogTitle>
                <DialogDescription>Record petty cash out of the drawer.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Operational", "Maintenance", "F&B Supplies", "Refund", "Other"].map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Plumber fee, Milk packet" />
                </div>
                <Button 
                  disabled={expenseLoading}
                  className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-4 font-medium"
                  onClick={handleExpenseSubmit}
                >
                  {expenseLoading ? "Saving Record..." : "Save Record"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground text-xs">
                  {e.created_at ? new Date(e.created_at).toLocaleString() : "Just now"}
                </TableCell>
                <TableCell>
                  <Pill tone="info">{e.category}</Pill>
                </TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{e.recorded_by}</TableCell>
                <TableCell className="font-semibold text-destructive">
                  - {inr(e.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {isAdmin ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            ))}
          </TableBody>
        </Table>
        {!expenses.length && (
          <div className="p-6">
            <EmptyState title="No expenses logged" body="Your petty cash ledger is empty." icon={Receipt} />
          </div>
        )}
      </Panel>
    </div>
  )
}
