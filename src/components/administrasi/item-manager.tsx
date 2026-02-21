"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Minus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ExternalLink,
  Package,
  Check,
  RotateCcw,
  CopyPlus,
  CheckSquare,
  RefreshCw,
  Edit2,
} from "lucide-react";
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  reorderItem as reorderItemAction,
  markAsDone,
  markAsUndone,
  Item,
  ItemFormData,
} from "@/app/actions/item";
import { useConfirmation } from "@/components/providers/modal-provider";
import { useAlert } from "@/hooks/use-alert";
import { cn } from "@/lib/utils";
import {
  TableWrapper,
  TableScrollArea,
  Table,
  TableHeader,
  TableHeaderContent,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components/ui/table";

import Modal from "@/components/ui/modal";

interface ItemManagerProps {
  initialItems: Item[];
  initialPagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  userRole: string;
  userName: string;
}

export default function ItemManager({
  initialItems,
  initialPagination,
  userRole,
  userName,
}: ItemManagerProps) {
  const { showConfirmation } = useConfirmation();
  const { showAlert, showError } = useAlert();

  // State
  const [items, setItems] = useState<Item[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(
    initialPagination?.current_page || 1,
  );
  const [totalPages, setTotalPages] = useState(initialPagination?.last_page || 1);
  const [totalCount, setTotalCount] = useState(
    initialPagination?.total || initialItems.length,
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    initialPagination?.per_page || 15,
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchItems = useCallback(
    async (page = 1, searchQuery = "", status = statusFilter) => {
      setLoading(true);
      try {
        const result = await getItems({
          page,
          per_page: itemsPerPage,
          search: searchQuery || undefined,
          status: status !== "all" ? status : undefined,
        });

        if (result.success && result.data) {
          setItems(result.data.items);
          setTotalPages(result.data.pagination.last_page);
          setCurrentPage(result.data.pagination.current_page);
          setTotalCount(result.data.pagination.total);
          // setItemsPerPage(result.data.pagination.per_page); // Removed as per instruction
        } else {
          showError(result.message || "Gagal mengambil data");
        }
      } catch (error) {
        console.error("Error fetching items:", error);
        showError("Terjadi kesalahan koneksi");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, itemsPerPage, showError],
  );

  // Refs for stable function references
  const fetchItemsRef = useRef<
    ((page?: number, searchQuery?: string, status?: string) => Promise<void>) | null
  >(null);

  // Keep ref updated
  fetchItemsRef.current = fetchItems;

  // Initial load - only run once on mount
  useEffect(() => {
    // No longer conditional on initialItems.length, always fetch if initialPagination is not provided or if we need to refresh
    if (!initialPagination) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search/filter with debounce - skip first render
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchItemsRef.current?.(1, search, statusFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false); // Renamed to showForm for clarity
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [reorderingItem, setReorderingItem] = useState<Item | null>(null); // For re-order mode
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ItemFormData>({
    requester_name: "",
    division: "",
    request_date: new Date().toISOString().split("T")[0],
    items: [{ name: "", quantity: 1, link: "" }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (reorderingItem) {
        // Reorder mode - create new item from existing
        const result = await reorderItemAction(
          reorderingItem.id,
          formData.items[0].quantity,
        );
        if (result.success) {
          showAlert("Berhasil membuat order baru", "success");
          setIsModalOpen(false);
          setReorderingItem(null);
          fetchItems(1, search);
        } else {
          showError(result.message || "Gagal membuat order baru");
        }
      } else if (editingItem) {
        const updateData = {
          requester_name: formData.requester_name,
          division: formData.division,
          item_name: formData.items[0].name,
          quantity: formData.items[0].quantity,
          link: formData.items[0].link,
        };
        const result = await updateItem(editingItem.id, updateData);
        if (result.success) {
          showAlert("Permintaan berhasil diperbarui", "success");
          setIsModalOpen(false);
          fetchItems(currentPage, search);
        } else {
          showError(result.message || "Gagal memperbarui");
        }
      } else {
        const result = await createItem(formData);
        if (result.success) {
          showAlert("Permintaan berhasil dibuat", "success");
          setIsModalOpen(false);
          fetchItems(1, search);
        } else {
          showError(result.message || "Gagal membuat permintaan");
        }
      }
    } catch {
      showError("Terjadi kesalahan sistem");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (itemId: number) => {
    showConfirmation({
      title: "Hapus Permintaan",
      message: (
        <span>
          Apakah Anda yakin ingin menghapus permintaan ini secara permanen?
        </span>
      ),
      type: "confirm",
      action: async () => {
        try {
          const result = await deleteItem(itemId);
          if (result.success) {
            showAlert("Berhasil dihapus", "success");
            fetchItems(currentPage, search);
          } else {
            showError(result.message || "Gagal menghapus");
          }
        } catch {
          showError("Gagal menghapus");
        }
      },
    });
  };

  const handleReorder = (item: Item) => {
    // Set reorder mode - open modal with pre-filled data
    setReorderingItem(item);
    setEditingItem(null);
    setFormData({
      requester_name: item.requester_name,
      division: item.division,
      request_date: new Date().toISOString().split("T")[0], // Today's date
      items: [
        {
          name: item.item_name,
          quantity: 1, // Reset quantity for new order
          link: item.link || "",
        },
      ],
    });
    setIsModalOpen(true);
  };

  // State for Mark Done modal
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [doneQuantity, setDoneQuantity] = useState<number | string>("");
  const [showDoneDialog, setShowDoneDialog] = useState(false);
  const [markDoneLoading, setMarkDoneLoading] = useState(false);

  const handleMarkDone = async () => {
    if (!selectedItem) return;
    const qty = parseInt(doneQuantity as string);
    if (isNaN(qty) || qty < 1) {
      showError("Jumlah harus diisi minimal 1");
      return;
    }

    setMarkDoneLoading(true);
    try {
      const result = await markAsDone(selectedItem.id, qty);
      if (result.success) {
        showAlert("Item berhasil ditandai sudah diorder", "success");
        setSelectedItem(null);
        setDoneQuantity("");
        setShowDoneDialog(false);
        fetchItems(currentPage, search);
      } else {
        showError(result.message || "Gagal menandai item");
      }
    } catch {
      showError("Terjadi kesalahan sistem");
    } finally {
      setMarkDoneLoading(false);
    }
  };

  const handleMarkAsUndone = (itemId: number) => {
    showConfirmation({
      title: "Batalkan Order",
      message: (
        <span>
          Batalkan status order untuk item ini? Status akan kembali ke "Belum
          Diorder".
        </span>
      ),
      type: "confirm",
      action: async () => {
        try {
          const result = await markAsUndone(itemId);
          if (result.success) {
            showAlert("Order berhasil dibatalkan", "success");
            fetchItems(currentPage, search);
          } else {
            showError(result.message || "Gagal membatalkan order");
          }
        } catch {
          showError("Gagal membatalkan order");
        }
      },
    });
  };

  // Helper untuk cek apakah user adalah admin
  const isAdmin = userRole === "ADMIN";
  // Cek apakah user boleh menandai order (admin dan administrasi)
  const canMarkOrder = userRole === "ADMIN" || userRole === "ADMINISTRASI";

  return (
    <TableWrapper loading={loading}>
      <TableHeaderContent
        title="Permintaan Barang"
        description="Pantau dan kelola permintaan pengadaan barang dari berbagai divisi secara real-time."
        icon={<Package className="w-5 h-5" />}
        actions={
          <>
            <div className="relative flex-1 sm:min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari permintaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-[160px] pl-4 pr-10 py-2 bg-background border border-border rounded-xl text-sm outline-none cursor-pointer hover:bg-accent transition-colors appearance-none"
              >
                <option value="all">Semua Status</option>
                <option value="Belum Diorder">Belum Diorder</option>
                <option value="Sudah Diorder">Sudah Diorder</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <button
              onClick={() => {
                setEditingItem(null);
                setReorderingItem(null);
                setFormData({
                  requester_name: isAdmin ? "" : userName,
                  division: isAdmin ? "" : userRole,
                  request_date: new Date().toISOString().split("T")[0],
                  items: [{ name: "", quantity: 1, link: "" }],
                });
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Buat Permintaan
            </button>
          </>
        }
      />

      <TableScrollArea>
        <Table>
          <TableHeader>
            <TableRow hoverable={false}>
              <TableHead>Status</TableHead>
              <TableHead>Pemohon</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead align="right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border",
                      item.status_order === "Sudah Diorder"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-orange-500/10 text-orange-600 border-orange-500/20",
                    )}
                  >
                    {item.status_order}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-foreground text-sm font-medium">
                      {item.requester_name}
                    </span>
                    <span className="text-xs text-muted-foreground italic">
                      {item.division}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px]">
                    <p className="text-foreground leading-tight">{item.item_name}</p>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary flex items-center gap-1 mt-1 hover:underline font-bold uppercase tracking-wider"
                      >
                        <ExternalLink className="w-3 h-3" /> Buka Tautan
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 bg-muted rounded-md text-xs font-bold text-foreground">
                    {item.quantity}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Admin & Administrasi: Mark as Done / Undone */}
                    {canMarkOrder && (
                      <>
                        {item.status_order === "Belum Diorder" ? (
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setDoneQuantity(item.quantity);
                              setShowDoneDialog(true);
                            }}
                            className="p-1.5 h-8 w-8 !opacity-100 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200"
                            title="Tandai Sudah Diorder"
                          >
                            <CheckSquare className="w-4.5 h-4.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkAsUndone(item.id)}
                            className="p-1.5 h-8 w-8 !opacity-100 flex items-center justify-center rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-all duration-200"
                            title="Tandai Belum Diorder"
                          >
                            <RotateCcw className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </>
                    )}
                    {/* Re-Order Button - only for items already ordered */}
                    {item.status_order === "Sudah Diorder" && (
                      <button
                        onClick={() => handleReorder(item)}
                        className="p-1.5 h-8 w-8 !opacity-100 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                        title="Reorder"
                      >
                        <RefreshCw className="w-4.5 h-4.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setReorderingItem(null);
                        setFormData({
                          requester_name: item.requester_name,
                          division: item.division,
                          request_date: item.request_date,
                          items: [
                            {
                              name: item.item_name,
                              quantity: item.quantity,
                              link: item.link || "",
                            },
                          ],
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 h-8 w-8 !opacity-100 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
                      title="Edit"
                    >
                      <Edit2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 h-8 w-8 !opacity-100 flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-200"
                      title="Hapus"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableEmpty
                colSpan={5}
                icon={<Package className="w-12 h-12 opacity-20" />}
                message="Belum ada data permintaan barang."
              />
            )}
          </TableBody>
        </Table>
      </TableScrollArea>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => fetchItems(page, search)}
        onItemsPerPageChange={(count) => {
          setItemsPerPage(count);
          fetchItems(1, search);
        }}
      />

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setReorderingItem(null);
          }}
          title={
            reorderingItem
              ? "Re-Order Barang"
              : editingItem
                ? "Edit Permintaan"
                : "Permintaan Baru"
          }
          maxWidth="lg"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setReorderingItem(null);
                }}
                className="px-5 py-2 text-sm font-bold hover:bg-accent rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="item-form"
                disabled={saving}
                className={cn(
                  "px-8 py-2 text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2",
                  reorderingItem
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {saving && (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                )}
                {reorderingItem ? "Buat Order Baru" : "Simpan Permintaan"}
              </button>
            </div>
          }
        >
          <form
            id="item-form"
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                    Nama Pemohon
                  </label>
                  <input
                    className={cn(
                      "w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-medium",
                      reorderingItem || (!isAdmin && !editingItem)
                        ? "bg-muted cursor-not-allowed text-muted-foreground"
                        : "bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    )}
                    value={formData.requester_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requester_name: e.target.value,
                      })
                    }
                    placeholder="Contoh: Wahyu"
                    required
                    disabled={!!reorderingItem || (!isAdmin && !editingItem)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                    Divisi
                  </label>
                  <input
                    className={cn(
                      "w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-medium",
                      reorderingItem || (!isAdmin && !editingItem)
                        ? "bg-muted cursor-not-allowed text-muted-foreground"
                        : "bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    )}
                    value={formData.division}
                    onChange={(e) =>
                      setFormData({ ...formData, division: e.target.value })
                    }
                    placeholder="Contoh: TEKNISI"
                    required
                    disabled={!!reorderingItem || (!isAdmin && !editingItem)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                  Tanggal Permintaan
                </label>
                <input
                  type="date"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  value={formData.request_date}
                  onChange={(e) =>
                    setFormData({ ...formData, request_date: e.target.value })
                  }
                />
              </div>

              <div className="pt-2 border-t border-border space-y-4">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                    Detail Barang
                  </p>

                  {!editingItem && !reorderingItem && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.items.length > 1) {
                            const newItems = [...formData.items];
                            newItems.pop();
                            setFormData({ ...formData, items: newItems });
                          }
                        }}
                        disabled={formData.items.length <= 1}
                        className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-200"
                        title="Hapus Baris Terakhir"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">
                        {formData.items.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            items: [
                              ...formData.items,
                              { name: "", quantity: 1, link: "" },
                            ],
                          });
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors border border-primary/20"
                        title="Tambah Barang"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {formData.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-muted/30 p-5 rounded-2xl border border-border space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                          Nama Barang
                        </label>
                        <input
                          className={cn(
                            "w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-medium",
                            reorderingItem
                              ? "bg-muted cursor-not-allowed text-muted-foreground"
                              : "bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          )}
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].name = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                          placeholder="Nama barang..."
                          required
                          disabled={!!reorderingItem}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].quantity = e.target.value === "" ? ("" as any) : parseInt(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          min="1"
                          required
                          autoFocus={!!reorderingItem}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                        Link Referensi
                      </label>
                      {reorderingItem && item.link ? (
                        <div className="flex gap-2">
                          <input
                            className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed truncate"
                            value={item.link}
                            disabled
                          />
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 w-12 flex items-center justify-center bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <input
                          className={cn(
                            "w-full border border-border rounded-xl px-4 py-2.5 text-sm outline-none transition-all text-primary font-medium",
                            reorderingItem
                              ? "bg-muted cursor-not-allowed text-muted-foreground"
                              : "bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary",
                          )}
                          value={item.link || ""}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].link = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                          placeholder={
                            reorderingItem ? "Tidak ada link" : "https://..."
                          }
                          disabled={!!reorderingItem}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Mark Done Modal */}
      {
        selectedItem && showDoneDialog && (
          <Modal
            isOpen={showDoneDialog}
            onClose={() => setShowDoneDialog(false)}
            title="Tandai Sudah Diorder"
            maxWidth="md"
            footer={
              <div className="flex justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowDoneDialog(false)}
                  className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleMarkDone}
                  disabled={markDoneLoading}
                  className="px-6 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-bold shadow-lg shadow-emerald-600/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {markDoneLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-sm" />
                      Memproses...
                    </>
                  ) : (
                    "Konfirmasi"
                  )}
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                  Nama Barang
                </label>
                <div className="p-3 bg-muted rounded-xl border border-border text-sm font-medium">
                  {selectedItem.item_name}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">
                  Jumlah yang Diorder
                </label>
                <input
                  type="number"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                  value={doneQuantity}
                  onChange={(e) => setDoneQuantity(e.target.value)}
                  min="1"
                  required
                />
              </div>
            </div>
          </Modal>
        )}
    </TableWrapper>
  );
}
