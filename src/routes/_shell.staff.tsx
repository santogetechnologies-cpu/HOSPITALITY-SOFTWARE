import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { toast } from "sonner";
import { Users, UserCheck, UserX, Shield, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_shell/staff")({
  head: () => ({
    meta: [
      { title: "Staff Roster — DRB Hotel PMS" },
      { name: "description", content: "Manage hotel staff access and roles." },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { profiles, session, updateStaffRole, toggleStaffStatus, addStaff, deleteStaff } = usePms();

  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const activeStaff = profiles.filter(p => p.status === 'ACTIVE');
  const inactiveStaff = profiles.filter(p => p.status === 'INACTIVE');

  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", phone: "", role: "FRONT_DESK" });

  const handleAdd = async () => {
    if (!form.name || !form.role) return toast.error("Please fill required fields");
    await addStaff(form.name, form.role, form.phone);
    setAddOpen(false);
    toast.success("Staff member added successfully");
    setForm({ name: "", phone: "", role: "FRONT_DESK" });
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Configuration"
        title="Staff & Access"
        subtitle="Manage employee logins and role-based permissions"
        actions={
          isSuperAdmin ? (
            <Button onClick={() => setAddOpen(true)} className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90">
              <Plus className="mr-2 size-4" /> Add Staff
            </Button>
          ) : (
            <Pill tone="info">{activeStaff.length} active members</Pill>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Panel bodyClassName="p-4 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-full bg-gold/10 text-gold">
            <Shield className="size-6" />
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">{profiles.filter(p => p.role === 'SUPER_ADMIN').length}</div>
            <div className="text-xs text-muted-foreground">Super Admins</div>
          </div>
        </Panel>
        <Panel bodyClassName="p-4 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
            <UserCheck className="size-6" />
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">{activeStaff.length}</div>
            <div className="text-xs text-muted-foreground">Active Staff</div>
          </div>
        </Panel>
        <Panel bodyClassName="p-4 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <UserX className="size-6" />
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">{inactiveStaff.length}</div>
            <div className="text-xs text-muted-foreground">Revoked Access</div>
          </div>
        </Panel>
      </div>

      <Panel title="Active Employees" description="Staff with current system access">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Access Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeStaff.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name || "Unnamed"}</TableCell>
                <TableCell>{p.phone || "—"}</TableCell>
                <TableCell>
                  {isSuperAdmin && p.id !== session.username ? ( // Using username instead of ID for safety check if ID doesn't match
                    <Select defaultValue={p.role} onValueChange={(r) => {
                      updateStaffRole(p.id, r);
                      toast.success(`${p.name}'s role updated to ${r}`);
                    }}>
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        <SelectItem value="GM">General Manager</SelectItem>
                        <SelectItem value="FRONT_DESK">Front Desk</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Pill tone={p.role === 'SUPER_ADMIN' ? 'gold' : 'info'}>{p.role}</Pill>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!isSuperAdmin || (p.role === 'SUPER_ADMIN' && p.name === session.name)}
                      onClick={() => {
                        toggleStaffStatus(p.id);
                        toast.warning(`${p.name}'s access revoked.`);
                      }}
                    >
                      Revoke
                    </Button>
                    {isSuperAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={async () => {
                        if(confirm("Are you sure you want to permanently delete this staff member?")) {
                          await deleteStaff(p.id);
                          toast.success("Staff deleted");
                        }
                      }}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!activeStaff.length && (
          <div className="p-6">
            <EmptyState title="No active staff" body="No one is currently active." icon={Users} />
          </div>
        )}
      </Panel>

      <Panel title="Revoked Accounts" description="Employees who can no longer log in">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Access Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inactiveStaff.map((p) => (
              <TableRow key={p.id} className="opacity-50 hover:opacity-100 transition-opacity">
                <TableCell className="font-medium line-through">{p.name || "Unnamed"}</TableCell>
                <TableCell>{p.role}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!isSuperAdmin}
                      onClick={() => {
                        toggleStaffStatus(p.id);
                        toast.success(`${p.name}'s access restored.`);
                      }}
                    >
                      Restore
                    </Button>
                    {isSuperAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={async () => {
                        if(confirm("Are you sure you want to permanently delete this staff member?")) {
                          await deleteStaff(p.id);
                          toast.success("Staff deleted");
                        }
                      }}>
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!inactiveStaff.length && (
          <div className="p-6">
             <EmptyState title="No revoked accounts" body="Everyone has active access." icon={UserCheck} />
          </div>
        )}
      </Panel>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>Create a new profile for an employee.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Doe" /></div>
            <div className="space-y-2"><Label>Phone Number</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91..." /></div>
            <div className="space-y-2"><Label>Role</Label>
              <Select value={form.role} onValueChange={(r) => setForm({...form, role: r})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="GM">General Manager</SelectItem>
                  <SelectItem value="FRONT_DESK">Front Desk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} className="bg-brass text-gold-foreground hover:opacity-90">Add Staff</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
