import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill } from '@/components/pms/bits'
import { usePms } from '@/lib/pms-store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_shell/complaints')({
  component: ComplaintsPage,
})

function ComplaintsPage() {
  const { tickets, rooms, addTicket } = usePms();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ room_id: "", issue: "", priority: "Medium", status: "Open" });

  const handleAdd = async () => {
    if (!form.issue) return toast.error("Please describe the issue");
    await addTicket({ ...form, assignee: "Unassigned" });
    setOpen(false);
    toast.success("Ticket logged");
    setForm({ room_id: "", issue: "", priority: "Medium", status: "Open" });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="Complaints & Maintenance" 
        subtitle="Track and resolve issues"
        actions={<Button onClick={() => setOpen(true)} className="rounded-xl bg-brass text-gold-foreground"><Plus className="mr-2 size-4" /> New Ticket</Button>}
      />

      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map(t => {
              const roomNum = rooms.find(r => r.id === t.room_id)?.room_number || "General";
              return (
                <TableRow key={t.id}>
                  <TableCell className="text-xs font-medium">{t.id.slice(0, 8)}</TableCell>
                  <TableCell>{roomNum}</TableCell>
                  <TableCell>{t.issue}</TableCell>
                  <TableCell>
                    <Pill tone={t.priority === 'High' ? 'destructive' : t.priority === 'Low' ? 'success' : 'warning'}>{t.priority}</Pill>
                  </TableCell>
                  <TableCell>
                    <Pill tone={t.status === 'Open' ? 'info' : t.status === 'Resolved' ? 'success' : 'warning'}>{t.status}</Pill>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!tickets.length && <div className="p-6 text-center text-sm text-muted-foreground">No open tickets.</div>}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log New Ticket</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Select value={form.room_id} onValueChange={(v) => setForm({...form, room_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select Room (Optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">General Property</SelectItem>
                {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Issue description..." value={form.issue} onChange={(e) => setForm({...form, issue: e.target.value})} />
            <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-brass text-gold-foreground">Create Ticket</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
