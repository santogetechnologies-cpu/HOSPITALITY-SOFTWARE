import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill, EmptyState } from "@/components/pms/bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePms } from "@/lib/pms-store";
import { inr, type InventoryItem, type InventoryCategory } from "@/lib/pms-data";
import { toast } from "sonner";
import {
  Boxes,
  Plus,
  ShoppingCart,
  Trash2,
  AlertTriangle,
  Package,
  Search,
  CheckCircle2,
  Edit2,
  LogOut,
  Receipt,
  Layers,
  Building,
} from "lucide-react";

export const Route = createFileRoute("/_shell/inventory")({
  component: InventoryPage,
});

const INVENTORY_CATEGORIES: InventoryCategory[] = [
  "Linens & Bedding",
  "Beverages & Water",
  "Guest Amenities",
  "Housekeeping Supplies",
  "F&B Supplies",
  "Maintenance & Fixtures",
  "General",
];

const DISCARD_REASONS = [
  "20L Water Can Emptied / Returned",
  "Damaged / Stained Linen or Pillow",
  "Torn / Worn Out in Laundry",
  "Broken / Defective Fixture",
  "Expired / Spoiled Amenities",
  "Damaged by Guest / Written Off",
  "Scrapped / Decommissioned",
  "General Waste / Discard",
];

function InventoryPage() {
  const {
    inventoryItems,
    inventoryTransactions,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordInventoryPurchase,
    recordInventoryDiscard,
    recordInventoryUsage,
    session,
  } = usePms();

  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;

  // Search and Filters
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState<string>("ALL");
  const [activeTab, setActiveTab] = React.useState("stock");

  // Modal States
  const [addItemOpen, setAddItemOpen] = React.useState(false);
  const [purchaseOpen, setPurchaseOpen] = React.useState(false);
  const [discardOpen, setDiscardOpen] = React.useState(false);
  const [usageOpen, setUsageOpen] = React.useState(false);
  const [editItemOpen, setEditItemOpen] = React.useState(false);

  const [selectedItemForAction, setSelectedItemForAction] = React.useState<InventoryItem | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Add Item Form State
  const [newItemName, setNewItemName] = React.useState("");
  const [newItemCategory, setNewItemCategory] = React.useState<string>("Linens & Bedding");
  const [newItemUnit, setNewItemUnit] = React.useState("pieces");
  const [newItemQty, setNewItemQty] = React.useState("");
  const [newItemMinThreshold, setNewItemMinThreshold] = React.useState("5");
  const [newItemCost, setNewItemCost] = React.useState("");
  const [newItemLocation, setNewItemLocation] = React.useState("Main Store Room");
  const [newItemSyncExpense, setNewItemSyncExpense] = React.useState(true);
  const [newItemNotes, setNewItemNotes] = React.useState("");

  // Purchase Form State
  const [purchaseItemId, setPurchaseItemId] = React.useState("");
  const [purchaseQty, setPurchaseQty] = React.useState("");
  const [purchaseUnitPrice, setPurchaseUnitPrice] = React.useState("");
  const [purchaseSyncExpense, setPurchaseSyncExpense] = React.useState(true);
  const [purchaseExpenseCat, setPurchaseExpenseCat] = React.useState("Inventory / Supplies");
  const [purchaseNotes, setPurchaseNotes] = React.useState("");

  // Discard Form State
  const [discardItemId, setDiscardItemId] = React.useState("");
  const [discardQty, setDiscardQty] = React.useState("");
  const [discardReason, setDiscardReason] = React.useState(DISCARD_REASONS[0]);
  const [discardNotes, setDiscardNotes] = React.useState("");

  // Usage Form State
  const [usageItemId, setUsageItemId] = React.useState("");
  const [usageQty, setUsageQty] = React.useState("");
  const [usageDestination, setUsageDestination] = React.useState("Housekeeping Floor 1");
  const [usageNotes, setUsageNotes] = React.useState("");

  // Edit Item Form State
  const [editName, setEditName] = React.useState("");
  const [editCategory, setEditCategory] = React.useState("");
  const [editUnit, setEditUnit] = React.useState("");
  const [editMinThreshold, setEditMinThreshold] = React.useState("");
  const [editCost, setEditCost] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");

  // Computed Metrics
  const totalStockValue = React.useMemo(() => {
    return inventoryItems.reduce(
      (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unit_cost) || 0),
      0
    );
  }, [inventoryItems]);

  const lowStockItems = React.useMemo(() => {
    return inventoryItems.filter(
      (item) => Number(item.quantity) <= Number(item.min_threshold) && Number(item.quantity) > 0
    );
  }, [inventoryItems]);

  const outOfStockItems = React.useMemo(() => {
    return inventoryItems.filter((item) => Number(item.quantity) <= 0);
  }, [inventoryItems]);

  const totalDiscardsCount = React.useMemo(() => {
    return inventoryTransactions
      .filter((t) => t.type === "DISCARD")
      .reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
  }, [inventoryTransactions]);

  const totalSyncedExpenseAmount = React.useMemo(() => {
    return inventoryTransactions
      .filter((t) => t.type === "PURCHASE" && t.sync_to_expenses)
      .reduce((acc, t) => acc + (Number(t.total_cost) || 0), 0);
  }, [inventoryTransactions]);

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.location && item.location.toLowerCase().includes(search.toLowerCase())) ||
        item.category.toLowerCase().includes(search.toLowerCase());

      const matchCat = selectedCategory === "ALL" || item.category === selectedCategory;

      let matchStatus = true;
      if (selectedStatus === "LOW") {
        matchStatus = Number(item.quantity) <= Number(item.min_threshold) && Number(item.quantity) > 0;
      } else if (selectedStatus === "OUT") {
        matchStatus = Number(item.quantity) <= 0;
      } else if (selectedStatus === "IN") {
        matchStatus = Number(item.quantity) > Number(item.min_threshold);
      }

      return matchSearch && matchCat && matchStatus;
    });
  }, [inventoryItems, search, selectedCategory, selectedStatus]);

  // Filtered Transactions
  const purchaseTransactions = React.useMemo(() => {
    return inventoryTransactions.filter((t) => t.type === "PURCHASE");
  }, [inventoryTransactions]);

  const discardTransactions = React.useMemo(() => {
    return inventoryTransactions.filter((t) => t.type === "DISCARD");
  }, [inventoryTransactions]);

  const usageTransactions = React.useMemo(() => {
    return inventoryTransactions.filter((t) => t.type === "CONSUMED");
  }, [inventoryTransactions]);

  // Handlers
  const handleAddNewItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Please enter item name");
      return;
    }
    const qty = parseFloat(newItemQty) || 0;
    const cost = parseFloat(newItemCost) || 0;
    const minThresh = parseFloat(newItemMinThreshold) || 5;

    setActionLoading(true);
    try {
      const res = await addInventoryItem({
        name: newItemName.trim(),
        category: newItemCategory,
        unit: newItemUnit.trim() || "units",
        quantity: qty,
        min_threshold: minThresh,
        unit_cost: cost,
        location: newItemLocation.trim() || "Main Store Room",
        sync_to_expenses: newItemSyncExpense,
        notes: newItemNotes.trim(),
      });

      if (res?.success) {
        toast.success(
          `Item "${newItemName.trim()}" created successfully!${
            newItemSyncExpense && qty > 0 && cost > 0
              ? ` Synced ${inr(qty * cost)} to Petty Cash Expenses.`
              : ""
          }`
        );
        setAddItemOpen(false);
        // Reset form
        setNewItemName("");
        setNewItemQty("");
        setNewItemCost("");
        setNewItemNotes("");
      } else {
        toast.error(res?.error || "Failed to add inventory item");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickPurchase = async () => {
    const item = inventoryItems.find((i) => i.id === purchaseItemId);
    if (!item) {
      toast.error("Please select an inventory item to restock");
      return;
    }
    const qty = parseFloat(purchaseQty);
    const price = parseFloat(purchaseUnitPrice);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid purchase quantity");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid unit price");
      return;
    }

    setActionLoading(true);
    try {
      const res = await recordInventoryPurchase(
        purchaseItemId,
        qty,
        price,
        purchaseNotes.trim(),
        purchaseSyncExpense,
        purchaseExpenseCat
      );

      if (res?.success) {
        toast.success(
          `Restocked ${qty} ${item.unit} of ${item.name}.${
            purchaseSyncExpense ? ` Auto-recorded ${inr(qty * price)} in Expenses.` : ""
          }`
        );
        setPurchaseOpen(false);
        setPurchaseQty("");
        setPurchaseNotes("");
      } else {
        toast.error(res?.error || "Failed to record purchase");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickDiscard = async () => {
    const item = inventoryItems.find((i) => i.id === discardItemId);
    if (!item) {
      toast.error("Please select an item to discard");
      return;
    }
    const qty = parseFloat(discardQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter valid discard quantity");
      return;
    }
    if (qty > item.quantity) {
      toast.error(`Cannot discard ${qty} ${item.unit}. Only ${item.quantity} currently in stock.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await recordInventoryDiscard(
        discardItemId,
        qty,
        discardReason,
        discardNotes.trim()
      );

      if (res?.success) {
        toast.success(`Logged ${qty} ${item.unit} of ${item.name} discarded / written off.`);
        setDiscardOpen(false);
        setDiscardQty("");
        setDiscardNotes("");
      } else {
        toast.error(res?.error || "Failed to record discard");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickUsage = async () => {
    const item = inventoryItems.find((i) => i.id === usageItemId);
    if (!item) {
      toast.error("Please select an item");
      return;
    }
    const qty = parseFloat(usageQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter valid usage quantity");
      return;
    }
    if (qty > item.quantity) {
      toast.error(`Cannot issue ${qty} ${item.unit}. Only ${item.quantity} in stock.`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await recordInventoryUsage(
        usageItemId,
        qty,
        usageDestination.trim(),
        usageNotes.trim()
      );

      if (res?.success) {
        toast.success(`Issued ${qty} ${item.unit} of ${item.name} to ${usageDestination}.`);
        setUsageOpen(false);
        setUsageQty("");
        setUsageNotes("");
      } else {
        toast.error(res?.error || "Failed to record usage");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedItemForAction) return;
    if (!editName.trim()) {
      toast.error("Item name cannot be empty");
      return;
    }

    setActionLoading(true);
    try {
      const res = await updateInventoryItem(selectedItemForAction.id, {
        name: editName.trim(),
        category: editCategory,
        unit: editUnit.trim() || "units",
        min_threshold: parseFloat(editMinThreshold) || 5,
        unit_cost: parseFloat(editCost) || 0,
        location: editLocation.trim(),
      });

      if (res?.success) {
        toast.success("Item details updated");
        setEditItemOpen(false);
      } else {
        toast.error(res?.error || "Failed to update item");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openRestockModal = (item: InventoryItem) => {
    setSelectedItemForAction(item);
    setPurchaseItemId(item.id);
    setPurchaseUnitPrice(item.unit_cost?.toString() || "0");
    setPurchaseQty("");
    setPurchaseNotes("");
    setPurchaseSyncExpense(true);
    setPurchaseOpen(true);
  };

  const openDiscardModal = (item: InventoryItem) => {
    setSelectedItemForAction(item);
    setDiscardItemId(item.id);
    setDiscardQty("");
    setDiscardNotes("");
    setDiscardOpen(true);
  };

  const openUsageModal = (item: InventoryItem) => {
    setSelectedItemForAction(item);
    setUsageItemId(item.id);
    setUsageQty("");
    setUsageNotes("");
    setUsageOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setSelectedItemForAction(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditMinThreshold(item.min_threshold?.toString() || "5");
    setEditCost(item.unit_cost?.toString() || "0");
    setEditLocation(item.location || "");
    setEditItemOpen(true);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <PageHeader
        eyebrow="Finance & Operations"
        title="Inventory & Hotel Supplies"
        subtitle="Manage water cans, bedsheets, pillows, amenities, repurchases & automatic expense syncing"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-border bg-card/80 hover:bg-accent text-foreground shadow-xs font-medium"
              onClick={() => {
                if (inventoryItems.length === 0) {
                  toast.info("Please create an inventory item first.");
                  return;
                }
                setSelectedItemForAction(inventoryItems[0]);
                setDiscardItemId(inventoryItems[0].id);
                setDiscardQty("");
                setDiscardNotes("");
                setDiscardOpen(true);
              }}
            >
              <Trash2 className="size-4 mr-2 text-destructive" />
              Discard / Damaged
            </Button>

            <Button
              variant="outline"
              className="rounded-xl border-border bg-card/80 hover:bg-accent text-foreground shadow-xs font-medium"
              onClick={() => {
                if (inventoryItems.length === 0) {
                  toast.info("Please create an inventory item first.");
                  return;
                }
                setSelectedItemForAction(inventoryItems[0]);
                setPurchaseItemId(inventoryItems[0].id);
                setPurchaseUnitPrice(inventoryItems[0].unit_cost?.toString() || "0");
                setPurchaseQty("");
                setPurchaseNotes("");
                setPurchaseSyncExpense(true);
                setPurchaseOpen(true);
              }}
            >
              <ShoppingCart className="size-4 mr-2 text-emerald-600" />
              Repurchase Stock
            </Button>

            <Button
              className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-brass font-medium"
              onClick={() => {
                setNewItemName("");
                setNewItemQty("");
                setNewItemCost("");
                setNewItemNotes("");
                setNewItemSyncExpense(true);
                setAddItemOpen(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Add New Item
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Valuation */}
        <Panel className="p-4 relative overflow-hidden bg-card/90 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Stock Valuation
            </span>
            <div className="rounded-lg bg-brass/10 p-2 text-brass">
              <Boxes className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {inr(totalStockValue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {inventoryItems.length} active inventory items
          </p>
        </Panel>

        {/* In-Stock Items */}
        <Panel className="p-4 relative overflow-hidden bg-card/90 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total Item Types
            </span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Package className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {inventoryItems.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {inventoryItems.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)} total units in hand
          </p>
        </Panel>

        {/* Low Stock Warning */}
        <Panel
          className={`p-4 relative overflow-hidden border-border shadow-xs ${
            lowStockItems.length > 0 || outOfStockItems.length > 0
              ? "bg-amber-500/5 border-amber-500/30"
              : "bg-card/90"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Reorder Alerts
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
            {lowStockItems.length + outOfStockItems.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {outOfStockItems.length > 0
              ? `${outOfStockItems.length} out of stock, ${lowStockItems.length} low`
              : `${lowStockItems.length} items below minimum`}
          </p>
        </Panel>

        {/* Discarded / Damaged */}
        <Panel className="p-4 relative overflow-hidden bg-card/90 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Damaged / Emptied
            </span>
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
              <Trash2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-destructive">
            {totalDiscardsCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {discardTransactions.length} write-off events logged
          </p>
        </Panel>

        {/* Synced to Expenses */}
        <Panel className="p-4 relative overflow-hidden bg-card/90 border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Synced to Expenses
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
              <Receipt className="size-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {inr(totalSyncedExpenseAmount)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Auto-recorded in Petty Cash & P&L
          </p>
        </Panel>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl">
            <TabsTrigger value="stock" className="rounded-lg font-medium">
              <Boxes className="size-4 mr-2" />
              Stock in Hand ({inventoryItems.length})
            </TabsTrigger>
            <TabsTrigger value="purchases" className="rounded-lg font-medium">
              <ShoppingCart className="size-4 mr-2" />
              Purchases & Restock ({purchaseTransactions.length})
            </TabsTrigger>
            <TabsTrigger value="discards" className="rounded-lg font-medium">
              <Trash2 className="size-4 mr-2" />
              Discards & Damaged ({discardTransactions.length})
            </TabsTrigger>
            <TabsTrigger value="usage" className="rounded-lg font-medium">
              <Layers className="size-4 mr-2" />
              Issue & Usage ({usageTransactions.length})
            </TabsTrigger>
          </TabsList>

          {/* Search & Filters */}
          {activeTab === "stock" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search item, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm rounded-xl"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9 w-44 rounded-xl text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {INVENTORY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 w-36 rounded-xl text-xs">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="IN">In Stock</SelectItem>
                  <SelectItem value="LOW">Low Stock Alert</SelectItem>
                  <SelectItem value="OUT">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tab 1: Current Stock & Items */}
        <TabsContent value="stock" className="space-y-4 m-0">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Item Name & Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Min Threshold</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Stock Valuation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const qty = Number(item.quantity) || 0;
                  const minThresh = Number(item.min_threshold) || 5;
                  const isOut = qty <= 0;
                  const isLow = qty <= minThresh && !isOut;
                  const itemValuation = qty * (Number(item.unit_cost) || 0);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                      {/* Name & Location */}
                      <TableCell>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="size-3" />
                          {item.location || "Main Store Room"}
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {item.category}
                        </span>
                      </TableCell>

                      {/* Stock Quantity */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold font-mono text-sm ${
                              isOut
                                ? "text-destructive"
                                : isLow
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground"
                            }`}
                          >
                            {qty} {item.unit}
                          </span>
                        </div>
                      </TableCell>

                      {/* Min Threshold */}
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {minThresh} {item.unit}
                      </TableCell>

                      {/* Unit Cost */}
                      <TableCell className="font-mono text-xs text-foreground">
                        {inr(item.unit_cost)}
                      </TableCell>

                      {/* Total Asset Value */}
                      <TableCell className="font-semibold font-mono text-xs text-foreground">
                        {inr(itemValuation)}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isOut ? (
                          <Pill tone="danger">Out of Stock</Pill>
                        ) : isLow ? (
                          <Pill tone="warning">Low Stock</Pill>
                        ) : (
                          <Pill tone="success">In Stock</Pill>
                        )}
                      </TableCell>

                      {/* Quick Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Repurchase */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg text-xs"
                            onClick={() => openRestockModal(item)}
                            title="Restock / Purchase"
                          >
                            <ShoppingCart className="size-3.5 mr-1" />
                            Restock
                          </Button>

                          {/* Discard / Damaged */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                            onClick={() => openDiscardModal(item)}
                            title="Discard / Mark Damaged or Empty"
                          >
                            <Trash2 className="size-3.5 mr-1" />
                            Discard
                          </Button>

                          {/* Issue / Use */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg text-xs"
                            onClick={() => openUsageModal(item)}
                            title="Issue to Room or Housekeeping"
                          >
                            <LogOut className="size-3.5 mr-1" />
                            Issue
                          </Button>

                          {/* Edit */}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg text-xs"
                              onClick={() => openEditModal(item)}
                              title="Edit item"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                          )}

                          {/* Delete */}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg text-xs"
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete "${item.name}" from inventory? All associated transaction records will be removed.`
                                  )
                                ) {
                                  const delRes = await deleteInventoryItem(item.id);
                                  if (delRes?.success) toast.success(`"${item.name}" deleted.`);
                                  else toast.error(delRes?.error || "Failed to delete item");
                                }
                              }}
                              title="Delete Item"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {!filteredItems.length && (
              <div className="p-10">
                <EmptyState
                  title="No inventory items found"
                  body={
                    search
                      ? "No supplies match your search filters."
                      : "Start tracking hotel supplies by clicking '+ Add New Item'."
                  }
                  icon={Boxes}
                />
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* Tab 2: Purchases & Restock Log */}
        <TabsContent value="purchases" className="space-y-4 m-0">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Supply Item</TableHead>
                  <TableHead>Quantity Purchased</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Expenditure</TableHead>
                  <TableHead>Expense Sync Status</TableHead>
                  <TableHead>Purchaser & Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseTransactions.map((t) => {
                  const item = inventoryItems.find((i) => i.id === t.item_id);
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/40">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : "Just now"}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {item?.name || t.item_name || "Hotel Supply Item"}
                      </TableCell>
                      <TableCell className="font-mono text-emerald-600 font-bold">
                        + {t.quantity} {item?.unit || "units"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{inr(t.unit_price)}</TableCell>
                      <TableCell className="font-mono font-bold text-sm text-foreground">
                        {inr(t.total_cost)}
                      </TableCell>
                      <TableCell>
                        {t.sync_to_expenses ? (
                          <div className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="size-3" /> Synced to Expenses
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not Synced</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-foreground">{t.performed_by}</div>
                        {t.notes && <div className="text-xs text-muted-foreground">{t.notes}</div>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {!purchaseTransactions.length && (
              <div className="p-10">
                <EmptyState
                  title="No purchase logs recorded yet"
                  body="Purchases and restock orders will appear here along with their expense syncing status."
                  icon={ShoppingCart}
                />
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* Tab 3: Discards & Damaged Ledger */}
        <TabsContent value="discards" className="space-y-4 m-0">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity Discarded</TableHead>
                  <TableHead>Reason for Discard / Write-Off</TableHead>
                  <TableHead>Estimated Loss Value</TableHead>
                  <TableHead>Logged By</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discardTransactions.map((t) => {
                  const item = inventoryItems.find((i) => i.id === t.item_id);
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/40">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : "Just now"}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {item?.name || t.item_name || "Hotel Supply Item"}
                      </TableCell>
                      <TableCell className="font-mono text-destructive font-bold">
                        - {t.quantity} {item?.unit || "units"}
                      </TableCell>
                      <TableCell>
                        <Pill tone="danger">{t.reason || "Discarded"}</Pill>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {inr(t.total_cost)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {t.performed_by}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {!discardTransactions.length && (
              <div className="p-10">
                <EmptyState
                  title="No discarded or damaged items recorded"
                  body="When water cans are emptied, bedsheets torn, or pillows damaged, log them here to keep stock clean and accountable."
                  icon={Trash2}
                />
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* Tab 4: Usage & Department Issues */}
        <TabsContent value="usage" className="space-y-4 m-0">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity Issued</TableHead>
                  <TableHead>Issued To / Destination</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Authorized By</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageTransactions.map((t) => {
                  const item = inventoryItems.find((i) => i.id === t.item_id);
                  return (
                    <TableRow key={t.id} className="hover:bg-muted/40">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : "Just now"}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {item?.name || t.item_name || "Hotel Supply Item"}
                      </TableCell>
                      <TableCell className="font-mono text-blue-600 font-bold">
                        - {t.quantity} {item?.unit || "units"}
                      </TableCell>
                      <TableCell>
                        <Pill tone="info">{t.reason || "Department Issue"}</Pill>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {inr(t.total_cost)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground">
                        {t.performed_by}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.notes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {!usageTransactions.length && (
              <div className="p-10">
                <EmptyState
                  title="No department issues recorded yet"
                  body="Track supplies dispatched to guest rooms, housekeeping floors, reception, or kitchen."
                  icon={Layers}
                />
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {/* DIALOG 1: Add New Inventory Item */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="size-5 text-brass" /> Add New Inventory Item
            </DialogTitle>
            <DialogDescription>
              Register a hotel supply item (e.g. 20L Water Can, Bed Sheets, Pillows) for stock tracking and expense syncing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. 20L Water Can, Deluxe Pillows, White King Bedsheet"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unit of Measure</Label>
                <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pieces">Pieces</SelectItem>
                    <SelectItem value="cans">Cans</SelectItem>
                    <SelectItem value="bottles">Bottles</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="kits">Kits</SelectItem>
                    <SelectItem value="pairs">Pairs</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="packets">Packets</SelectItem>
                    <SelectItem value="sets">Sets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Initial Stock</Label>
                <Input
                  type="number"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Min Alert Level</Label>
                <Input
                  type="number"
                  value={newItemMinThreshold}
                  onChange={(e) => setNewItemMinThreshold(e.target.value)}
                  placeholder="5"
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Cost (₹)</Label>
                <Input
                  type="number"
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input
                value={newItemLocation}
                onChange={(e) => setNewItemLocation(e.target.value)}
                placeholder="e.g. Main Store Room, Linen Closet Floor 2, Pantry"
              />
            </div>

            {/* Sync to Expenses Toggle */}
            {parseFloat(newItemQty) > 0 && parseFloat(newItemCost) > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-initial-expense"
                    checked={newItemSyncExpense}
                    onCheckedChange={(c) => setNewItemSyncExpense(Boolean(c))}
                  />
                  <label
                    htmlFor="sync-initial-expense"
                    className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                  >
                    <Receipt className="size-4 text-emerald-600" />
                    Sync initial purchase to Expenses ledger ({inr(parseFloat(newItemQty || "0") * parseFloat(newItemCost || "0"))})
                  </label>
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Automatically logs this initial stock cost into the hotel petty cash / operating expenses ledger.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Supplier info, batch number, etc."
              />
            </div>

            <Button
              disabled={actionLoading}
              className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-2 font-medium"
              onClick={handleAddNewItem}
            >
              {actionLoading ? "Creating Item..." : "Save Inventory Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Quick Purchase / Repurchase */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-emerald-600" /> Log Restock / Repurchase Order
            </DialogTitle>
            <DialogDescription>
              Buy new stock for hotel supplies. Purchase amounts can automatically sync to the Expenses ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select Item to Restock *</Label>
              <Select
                value={purchaseItemId}
                onValueChange={(val) => {
                  setPurchaseItemId(val);
                  const selected = inventoryItems.find((i) => i.id === val);
                  if (selected) {
                    setPurchaseUnitPrice(selected.unit_cost?.toString() || "0");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose item..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Current: {item.quantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity to Purchase *</Label>
                <Input
                  type="number"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Cost (₹) *</Label>
                <Input
                  type="number"
                  value={purchaseUnitPrice}
                  onChange={(e) => setPurchaseUnitPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Total Cost Display */}
            {parseFloat(purchaseQty) > 0 && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Purchase Cost:</span>
                <span className="font-mono font-bold text-lg text-foreground">
                  {inr((parseFloat(purchaseQty) || 0) * (parseFloat(purchaseUnitPrice) || 0))}
                </span>
              </div>
            )}

            {/* Sync to Expenses Toggle */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sync-purchase-expense"
                  checked={purchaseSyncExpense}
                  onCheckedChange={(c) => setPurchaseSyncExpense(Boolean(c))}
                />
                <label
                  htmlFor="sync-purchase-expense"
                  className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-1.5"
                >
                  <Receipt className="size-4 text-emerald-600" />
                  Auto-sync purchase to Petty Cash & Expenses Ledger
                </label>
              </div>

              {purchaseSyncExpense && (
                <div className="pl-6 space-y-2">
                  <Label className="text-xs">Expense Category</Label>
                  <Select value={purchaseExpenseCat} onValueChange={setPurchaseExpenseCat}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inventory / Supplies">Inventory / Supplies</SelectItem>
                      <SelectItem value="Operational">Operational</SelectItem>
                      <SelectItem value="F&B Supplies">F&B Supplies</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Supplier / Invoice Notes (Optional)</Label>
              <Input
                value={purchaseNotes}
                onChange={(e) => setPurchaseNotes(e.target.value)}
                placeholder="e.g. Bisleri Vendor, City Linens Invoice #492"
              />
            </div>

            <Button
              disabled={actionLoading}
              className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-2 font-medium"
              onClick={handleQuickPurchase}
            >
              {actionLoading ? "Recording Purchase..." : "Confirm & Record Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Discard / Damaged / Emptied */}
      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Record Discard, Empty, or Damaged Supply
            </DialogTitle>
            <DialogDescription>
              Write off empty water cans, damaged pillows, stained/torn bedsheets, or expired supplies from active stock.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select Item *</Label>
              <Select value={discardItemId} onValueChange={setDiscardItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose item..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Stock: {item.quantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity Discarded *</Label>
                <Input
                  type="number"
                  value={discardQty}
                  onChange={(e) => setDiscardQty(e.target.value)}
                  placeholder="e.g. 2"
                />
              </div>

              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select value={discardReason} onValueChange={setDiscardReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCARD_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Inspection Remarks / Details</Label>
              <Input
                value={discardNotes}
                onChange={(e) => setDiscardNotes(e.target.value)}
                placeholder="e.g. 2 water cans returned empty to supplier, pillow torn during room 204 cleaning"
              />
            </div>

            <Button
              disabled={actionLoading}
              variant="destructive"
              className="w-full mt-2 font-medium"
              onClick={handleQuickDiscard}
            >
              {actionLoading ? "Recording Discard..." : "Confirm & Deduct Stock"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: Issue / Department Usage */}
      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="size-5 text-blue-600" /> Issue Supplies to Department / Room
            </DialogTitle>
            <DialogDescription>
              Record supplies issued to housekeeping, specific guest rooms, pantry, or front desk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select Supply Item *</Label>
              <Select value={usageItemId} onValueChange={setUsageItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose item..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Stock: {item.quantity} {item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity Issued *</Label>
                <Input
                  type="number"
                  value={usageQty}
                  onChange={(e) => setUsageQty(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>

              <div className="space-y-2">
                <Label>Issued To / Destination</Label>
                <Select value={usageDestination} onValueChange={setUsageDestination}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Housekeeping Floor 1">Housekeeping Floor 1</SelectItem>
                    <SelectItem value="Housekeeping Floor 2">Housekeeping Floor 2</SelectItem>
                    <SelectItem value="Housekeeping Floor 3">Housekeeping Floor 3</SelectItem>
                    <SelectItem value="Housekeeping Floor 4">Housekeeping Floor 4</SelectItem>
                    <SelectItem value="Front Desk Reception">Front Desk Reception</SelectItem>
                    <SelectItem value="Party / Banquet Hall">Party / Banquet Hall</SelectItem>
                    <SelectItem value="Kitchen & Pantry">Kitchen & Pantry</SelectItem>
                    <SelectItem value="Maintenance Team">Maintenance Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Staff Notes</Label>
              <Input
                value={usageNotes}
                onChange={(e) => setUsageNotes(e.target.value)}
                placeholder="e.g. Daily towel refill, floor pantry restock"
              />
            </div>

            <Button
              disabled={actionLoading}
              className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-2 font-medium"
              onClick={handleQuickUsage}
            >
              {actionLoading ? "Issuing Stock..." : "Confirm Stock Issue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Edit Item */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-5 text-brass" /> Edit Inventory Item
            </DialogTitle>
            <DialogDescription>
              Update item specifications, reorder threshold, unit cost, or storage room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Min Alert Threshold</Label>
                <Input
                  type="number"
                  value={editMinThreshold}
                  onChange={(e) => setEditMinThreshold(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Unit Cost (₹)</Label>
                <Input
                  type="number"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Storage Location</Label>
              <Input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>

            <Button
              disabled={actionLoading}
              className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-2 font-medium"
              onClick={handleSaveEdit}
            >
              {actionLoading ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
