import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { toast } from "sonner";
import { Users, UserCheck, UserX, Shield } from "lucide-react";

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
  const { profiles, session, updateStaffRole, toggleStaffStatus } = usePms();

  const isSuperAdmin = session?.role === "SUPER_ADMIN";

  const activeStaff = profiles.filter(p => p.status === 'ACTIVE');
  const inactiveStaff = profiles.filter(p => p.status === 'INACTIVE');

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Configuration"
        title="Staff & Access"
        subtitle="Manage employee logins and role-based permissions"
        actions={<Pill tone="info">{activeStaff.length} active members</Pill>}
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!isSuperAdmin || (p.role === 'SUPER_ADMIN' && p.name === session.name)}
                    onClick={() => {
                      toggleStaffStatus(p.id);
                      toast.warning(`${p.name}'s access revoked.`);
                    }}
                  >
                    Revoke Login
                  </Button>
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!isSuperAdmin}
                    onClick={() => {
                      toggleStaffStatus(p.id);
                      toast.success(`${p.name}'s access restored.`);
                    }}
                  >
                    Restore Login
                  </Button>
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
    </div>
  );
}
