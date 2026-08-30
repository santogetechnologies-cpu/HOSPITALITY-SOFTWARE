import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { toast } from "sonner";
import { Users, UserCheck, UserX, Shield, Plus, Trash2, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_shell/staff")({
  head: () => ({
    meta: [
      { title: "Staff & Access Control — DRB Hotel PMS" },
      { name: "description", content: "Manage hotel employee logins, passwords, and role-based permissions." },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { profiles, session, updateStaffRole, updateStaffPassword, toggleStaffStatus, addStaff, deleteStaff } = usePms();

  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const activeStaff = profiles.filter(p => (p.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
  const inactiveStaff = profiles.filter(p => (p.status || 'ACTIVE').toUpperCase() !== 'ACTIVE');

  // Add staff modal
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", phone: "", role: "FRONT_DESK", email: "", password: "" });

  // Change password modal
  const [passOpen, setPassOpen] = React.useState(false);
  const [selectedStaff, setSelectedStaff] = React.useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = React.useState("");

  const handleAdd = async () => {
    if (!form.name.trim()) return toast.error("Please enter staff member name");
    if (!form.password.trim()) return toast.error("Please enter login password or PIN");

    const res = await addStaff(form.name.trim(), form.role, form.phone.trim(), form.email.trim(), form.password.trim());
    if (res?.success) {
      toast.success(`Staff profile for "${form.name}" created successfully`);
      setAddOpen(false);
      setForm({ name: "", phone: "", role: "FRONT_DESK", email: "", password: "" });
    } else {
      toast.error(res?.error || "Failed to create staff profile");
    }
  };

  const handleChangePassword = async () => {
    if (!selectedStaff) return;
    if (!newPassword.trim()) return toast.error("Please enter a new password or PIN");

    const res = await updateStaffPassword(selectedStaff.id, newPassword.trim());
    if (res?.success) {
      toast.success(`Password for ${selectedStaff.name} updated successfully!`);
      setPassOpen(false);
      setSelectedStaff(null);
      setNewPassword("");
    } else {
      toast.error(res?.error || "Failed to update password");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Configuration"
        title="Staff & Access"
        subtitle="Manage employee logins, reset passwords, and assign role-based permissions"
        actions={
          <Button onClick={() => setAddOpen(true)} className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90">
            <Plus className="mr-2 size-4" /> Add Staff Member
          </Button>
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
            <div className="text-xs text-muted-foreground">Active Staff Members</div>
          </div>
        </Panel>
        <Panel bodyClassName="p-4 flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <UserX className="size-6" />
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">{inactiveStaff.length}</div>
            <div className="text-xs text-muted-foreground">Revoked Logins</div>
          </div>
        </Panel>
      </div>

      <Panel title="Active Employees & Staff Roster" description="All registered staff members with system access">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Name</TableHead>
              <TableHead>Email / Login</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.name || "Unnamed Staff"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.email || p.id}</TableCell>
                <TableCell>{p.phone || "—"}</TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <Pill tone={p.status === 'ACTIVE' ? 'success' : 'destructive'}>
                    {p.status || 'ACTIVE'}
                  </Pill>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedStaff({ id: p.id, name: p.name });
                        setPassOpen(true);
                      }}
                      title="Change or reset password"
                    >
                      <KeyRound className="size-3.5 mr-1 text-gold" />
                      Password
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        toggleStaffStatus(p.id);
                        toast.info(`Status toggled for ${p.name}`);
                      }}
                    >
                      {p.status === 'ACTIVE' ? 'Revoke' : 'Activate'}
                    </Button>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" 
                      onClick={async () => {
                        if (confirm(`Are you sure you want to permanently delete staff member "${p.name}"?`)) {
                          const delRes = await deleteStaff(p.id);
                          if (delRes?.success) toast.success("Staff member deleted");
                          else toast.error(delRes?.error || "Failed to delete staff member");
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!profiles.length && (
          <div className="p-8">
            <EmptyState title="No Staff Profiles" body="Click 'Add Staff Member' above to create employee logins." icon={Users} />
          </div>
        )}
      </Panel>

      {/* Add Staff Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee / Staff Login</DialogTitle>
            <DialogDescription>Create a new staff profile and set their system role.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Ramesh Kumar" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Email / Username</Label>
                <Input placeholder="staff@drbhotel.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>System Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FRONT_DESK">Front Desk</SelectItem>
                    <SelectItem value="GM">General Manager</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Password / PIN *</Label>
                <Input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} className="bg-brass text-gold-foreground">Create Staff Login</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passOpen} onOpenChange={(o) => { if (!o) { setPassOpen(false); setSelectedStaff(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password / PIN</DialogTitle>
            <DialogDescription>
              Set a new login password or PIN for {selectedStaff?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>New Password / PIN</Label>
              <Input
                type="password"
                placeholder="Enter new password or PIN"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPassOpen(false)}>Cancel</Button>
              <Button onClick={handleChangePassword} className="bg-brass text-gold-foreground">
                Update Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
