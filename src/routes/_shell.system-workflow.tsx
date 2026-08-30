import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/pms/bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, ArrowRight, ArrowDown } from "lucide-react";

export const Route = createFileRoute("/_shell/system-workflow")({
  head: () => ({
    meta: [{ title: "System Workflow Guide — DRB Hotel PMS" }],
  }),
  component: SystemWorkflow,
});

const FlowArrow = ({ vertical = false }: { vertical?: boolean }) => (
  <div className={`flex items-center justify-center text-muted-foreground ${vertical ? 'py-2' : 'px-2'}`}>
    {vertical ? <ArrowDown className="size-5" /> : <ArrowRight className="size-5" />}
  </div>
);

const FlowNode = ({ children, active, frozen }: { children: React.ReactNode, active?: boolean, frozen?: boolean }) => (
  <div className={`flex items-center justify-center rounded-lg border px-4 py-3 text-center text-sm font-semibold shadow-sm transition-colors
    ${frozen ? 'border-sky-500/30 bg-sky-500/10 text-sky-700' : 
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-card-foreground'}`}>
    {children}
  </div>
);

const FlowRow = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center">{children}</div>
);

const FlowCol = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center">{children}</div>
);

function SystemWorkflow() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <PageHeader 
        title="System Workflow & Architecture" 
        subtitle="Complete operational guide and business rules for the DRB Hostel & Party Hall Management System." 
      />

      <div className="space-y-12">
        {/* 1. Product Overview */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">1. Product Overview</h2>
          <Panel>
            <p className="text-muted-foreground leading-relaxed">
              DRB is a lightweight Hostel / Guest House + Party Hall Management System. The system manages:
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3 text-sm text-foreground font-medium">
              <li>• Rooms</li>
              <li>• Guests</li>
              <li>• Reservations</li>
              <li>• Check-in / Check-out</li>
              <li>• Cleaning & Inspection</li>
              <li>• Payments</li>
              <li>• Discounts</li>
              <li>• Expenses</li>
              <li>• Party Hall Bookings</li>
              <li>• Staff Logins</li>
              <li>• Configuration</li>
              <li>• Reports</li>
            </ul>
            <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Login Roles</h3>
              <div className="flex gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Super Admin</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">General Manager</span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Front Desk</span>
              </div>
            </div>
          </Panel>
        </section>

        {/* Core Architecture */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">System Architecture Engine</h2>
          <Panel className="flex flex-col items-center p-8">
            <div className="w-full max-w-2xl">
              <FlowCol>
                <FlowNode active>DRB SYSTEM</FlowNode>
                <FlowArrow vertical />
                <div className="flex w-full items-start justify-between border-t-2 border-primary/20 pt-4 mt-2 relative">
                  <div className="absolute top-0 left-1/2 w-0.5 h-4 bg-primary/20 -translate-x-1/2 -mt-4" />
                  
                  <FlowCol>
                    <div className="font-bold text-primary mb-4">PROPERTY</div>
                    <div className="space-y-2 text-sm text-muted-foreground text-center">
                      <div>Rooms</div>
                      <div>Party Hall</div>
                      <div>Rates</div>
                      <div>Config</div>
                    </div>
                  </FlowCol>

                  <FlowCol>
                    <div className="font-bold text-primary mb-4">OPERATIONS</div>
                    <div className="space-y-2 text-sm text-muted-foreground text-center">
                      <div>Guests</div>
                      <div>Booking</div>
                      <div>Check-in</div>
                      <div>Checkout</div>
                      <div>Cleaning</div>
                      <div>Inspection</div>
                    </div>
                  </FlowCol>

                  <FlowCol>
                    <div className="font-bold text-primary mb-4">FINANCE</div>
                    <div className="space-y-2 text-sm text-muted-foreground text-center">
                      <div>Payments</div>
                      <div>Discounts</div>
                      <div>Expenses</div>
                    </div>
                  </FlowCol>
                </div>
                
                <div className="mt-8 flex w-full flex-col items-center border-t-2 border-primary/20 pt-4">
                   <FlowArrow vertical />
                   <FlowNode>REPORTING</FlowNode>
                   <FlowArrow vertical />
                   <FlowNode>ADMINISTRATION</FlowNode>
                </div>
              </FlowCol>
            </div>
          </Panel>
        </section>

        {/* Room Lifecycle */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Complete Room Lifecycle</h2>
          <Panel>
            <div className="rounded-lg bg-muted/40 p-6 overflow-x-auto">
              <FlowRow>
                <FlowNode active>AVAILABLE</FlowNode>
                <FlowArrow />
                <FlowNode>BOOKED</FlowNode>
                <FlowArrow />
                <FlowNode>CHECK-IN</FlowNode>
                <FlowArrow />
                <FlowNode>OCCUPIED</FlowNode>
                <FlowArrow />
                <FlowNode>CHECK-OUT</FlowNode>
                <FlowArrow />
                <FlowNode>DIRTY</FlowNode>
              </FlowRow>
              <div className="mt-4">
                <FlowRow>
                  <FlowNode>DIRTY</FlowNode>
                  <FlowArrow />
                  <FlowNode>CLEANING</FlowNode>
                  <FlowArrow />
                  <FlowNode>INSPECTION</FlowNode>
                  <FlowArrow />
                  <FlowNode active>AVAILABLE</FlowNode>
                </FlowRow>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
              <XCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">Important Business Rule</p>
                <p className="text-sm mt-1">A checked-out room can <strong>never</strong> directly become Available. It must go through the mandatory workflow: Dirty → Cleaning → Inspection → Available.</p>
              </div>
            </div>
          </Panel>
        </section>

        {/* Walk-in & Party Hall Flow */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Walk-In Flow</h2>
            <Panel className="h-full">
              <FlowCol>
                <FlowNode>Walk-In Customer</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Available Room</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Guest Details</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Payment Record Created</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Full / Partial / No Payment</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Check-In</FlowNode>
                <FlowArrow vertical />
                <FlowNode active>OCCUPIED</FlowNode>
              </FlowCol>
              <p className="text-sm text-muted-foreground mt-6 text-center">Unpaid amounts remain in Pending Payments.</p>
            </Panel>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Party Hall Flow</h2>
            <Panel className="h-full">
               <FlowCol>
                <FlowNode>Customer</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Party Hall Reservation</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Payment Record Created</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Advance / No Advance</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Confirmed</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Event Ongoing</FlowNode>
                <FlowArrow vertical />
                <FlowNode active>COMPLETED</FlowNode>
                <FlowArrow vertical />
                <FlowNode>Final Payment</FlowNode>
              </FlowCol>
            </Panel>
          </section>
        </div>

        {/* Discount Flow */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Complete Discount Flow</h2>
          <Panel>
            <div className="flex flex-col items-center">
              <FlowCol>
                <FlowNode>PAYMENT</FlowNode>
                <FlowArrow vertical />
                <FlowNode>DISCOUNT REQUEST</FlowNode>
                <FlowArrow vertical />
                <FlowNode frozen>🔒 PAYMENT FROZEN</FlowNode>
                <FlowArrow vertical />
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm w-full max-w-lg">
                  <div className="text-center font-bold mb-4 text-primary">SUPER ADMIN</div>
                  <div className="grid grid-cols-3 gap-4">
                    <FlowCol>
                      <span className="text-xs font-semibold text-success mb-2">APPROVE</span>
                      <FlowArrow vertical />
                      <FlowNode>Revised Amount</FlowNode>
                    </FlowCol>
                    <FlowCol>
                      <span className="text-xs font-semibold text-destructive mb-2">REJECT</span>
                      <FlowArrow vertical />
                      <FlowNode>Original Amount</FlowNode>
                    </FlowCol>
                    <FlowCol>
                      <span className="text-xs font-semibold text-muted-foreground mb-2">WITHDRAW</span>
                      <FlowArrow vertical />
                      <FlowNode>Original Amount</FlowNode>
                    </FlowCol>
                  </div>
                </div>
                <FlowArrow vertical />
                <FlowNode>🔓 PAYMENT UNFROZEN</FlowNode>
              </FlowCol>
            </div>
            <div className="mt-6 text-sm text-muted-foreground">
              <p>When a discount request is raised, the payment is immediately frozen. No payment can be made until the request is Approved, Rejected, or Withdrawn.</p>
            </div>
          </Panel>
        </section>

        {/* Permission Structure Matrix */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">42. Permission Structure</h2>
          <Panel bodyClassName="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">Feature</TableHead>
                    <TableHead className="text-center font-bold">Super Admin</TableHead>
                    <TableHead className="text-center font-bold">General Manager</TableHead>
                    <TableHead className="text-center font-bold">Front Desk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { feature: "Dashboard", sa: true, gm: true, fd: true },
                    { feature: "Reservations", sa: true, gm: true, fd: true },
                    { feature: "Guests", sa: true, gm: true, fd: true },
                    { feature: "Rooms", sa: true, gm: true, fd: true },
                    { feature: "Check-In / Check-Out", sa: true, gm: true, fd: true },
                    { feature: "Cleaning & Inspection", sa: true, gm: true, fd: true },
                    { feature: "Party Hall", sa: true, gm: true, fd: true },
                    { feature: "Payments & History", sa: true, gm: true, fd: true },
                    { feature: "Raise Discount", sa: true, gm: true, fd: true },
                    { feature: "Approve Discount", sa: true, gm: false, fd: false },
                    { feature: "Raised Discounts (View)", sa: true, gm: true, fd: true },
                    { feature: "Expenses", sa: true, gm: true, fd: false },
                    { feature: "Reports", sa: true, gm: true, fd: "Limited" },
                    { feature: "Staff & Access", sa: true, gm: false, fd: false },
                    { feature: "Configuration", sa: true, gm: "Limited", fd: false },
                    { feature: "Notifications", sa: true, gm: true, fd: true },
                  ].map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.feature}</TableCell>
                      <TableCell className="text-center">
                        {row.sa === true ? <CheckCircle2 className="mx-auto size-5 text-success" /> : row.sa === false ? <XCircle className="mx-auto size-5 text-muted-foreground/30" /> : <span className="text-sm font-medium text-muted-foreground">{row.sa}</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.gm === true ? <CheckCircle2 className="mx-auto size-5 text-success" /> : row.gm === false ? <XCircle className="mx-auto size-5 text-muted-foreground/30" /> : <span className="text-sm font-medium text-muted-foreground">{row.gm}</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.fd === true ? <CheckCircle2 className="mx-auto size-5 text-success" /> : row.fd === false ? <XCircle className="mx-auto size-5 text-muted-foreground/30" /> : <span className="text-sm font-medium text-muted-foreground">{row.fd}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </section>

        {/* Hall & Room Rules */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Party Hall Rules</h2>
            <Panel>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="size-5 text-primary shrink-0" /> <span className="text-foreground font-medium">Single Inventory</span> DRB has one Party Hall managed separately from rooms.</li>
                <li className="flex gap-2"><CheckCircle2 className="size-5 text-primary shrink-0" /> <span className="text-foreground font-medium">No Overlaps</span> The system actively prevents overlapping bookings (e.g. 10am-2pm blocks 11am-3pm).</li>
                <li className="flex gap-2"><CheckCircle2 className="size-5 text-primary shrink-0" /> <span className="text-foreground font-medium">Central Payments</span> Hall bookings use the exact same unified payments and discount approval system.</li>
                <li className="flex gap-2"><CheckCircle2 className="size-5 text-primary shrink-0" /> <span className="text-foreground font-medium">Flexible Rates</span> Supports Hourly, Half-day, and Full-day rates with additional facilities configuration.</li>
              </ul>
            </Panel>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Configuration Rules</h2>
            <Panel>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="size-5 text-primary shrink-0" /> <span className="text-foreground font-medium">Capacity Limits</span> Booking system must never allow more guests than configured room capacity.</li>
                <li className="flex gap-2"><CheckCircle2 className="size-5 text-primary shrink-0" /> <span className="text-foreground font-medium">Price Integrity</span> Changing current room rates does not modify old completed bookings.</li>
                <li className="flex gap-2"><CheckCircle2 className="size-5 text-primary shrink-0" /> <span className="text-foreground font-medium">Strict Inspection</span> Only when all mandatory checks are completed does a room become Available.</li>
              </ul>
            </Panel>
          </section>
        </div>
      </div>
    </div>
  );
}
