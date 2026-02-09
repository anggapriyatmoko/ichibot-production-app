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
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";

interface ItemManagerProps {
  initialItems?: Item[];
  userRole?: string;
  userName?: string;
}

export default function ItemManager({
  initialItems = [],
  userRole = "",
  userName = "",
}: ItemManagerProps) {
  const { showConfirmation } = useConfirmation();
  const { showAlert, showError } = useAlert();

  // State
  const [items, setItems] = useState<Item[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchItems = useCallback(
    async (page = 1, searchQuery = "") => {
      setLoading(true);
      try {
        const result = await getItems({
          page,
          per_page: 15,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
        });

        if (result.success && result.data) {
          setItems(result.data.items);
          setTotalPages(result.data.pagination.last_page);
          setCurrentPage(result.data.pagination.current_page);
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
    [statusFilter, showError],
  );

  // Refs for stable function references
  const fetchItemsRef = useRef<
    ((page?: number, searchQuery?: string) => Promise<void>) | null
  >(null);

  // Keep ref updated
  fetchItemsRef.current = fetchItems;

  // Initial load - only run once on mount
  useEffect(() => {
    if (initialItems.length === 0) {
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
      fetchItemsRef.current?.(1, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
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
          showError((result as any).message || "Gagal membuat order baru");
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
          showError((result as any).message || "Gagal memperbarui");
        }
      } else {
        const result = await createItem(formData);
        if (result.success) {
          showAlert("Permintaan berhasil dibuat", "success");
          setIsModalOpen(false);
          fetchItems(1, search);
        } else {
          showError((result as any).message || "Gagal membuat permintaan");
        }
      }
    } catch {
      showError("Terjadi kesalahan sistem");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: Item) => {
    showConfirmation({
      title: "Hapus Permintaan",
      message: (
        <span>
          Apakah Anda yakin ingin menghapus permintaan{" "}
          <span className="font-semibold text-foreground">
            {item.item_name}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-foreground">
            {item.requester_name}
          </span>
          ?
        </span>
      ),
      type: "confirm",
      action: async () => {
        try {
          const result = await deleteItem(item.id);
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
  const [markDoneItem, setMarkDoneItem] = useState<Item | null>(null);
  const [markDoneQuantity, setMarkDoneQuantity] = useState("");
  const [markDoneLoading, setMarkDoneLoading] = useState(false);

  const handleMarkDone = async () => {
    if (!markDoneItem) return;
    const qty = parseInt(markDoneQuantity);
    if (isNaN(qty) || qty < 1) {
      showError("Jumlah harus diisi minimal 1");
      return;
    }

    setMarkDoneLoading(true);
    try {
      const result = await markAsDone(markDoneItem.id, qty);
      if (result.success) {
        showAlert("Item berhasil ditandai sudah diorder", "success");
        setMarkDoneItem(null);
        setMarkDoneQuantity("");
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

  const handleMarkUndone = (item: Item) => {
    showConfirmation({
      title: "Batalkan Order",
      message: (
        <span>
          Batalkan status order untuk{" "}
          <span className="font-semibold text-foreground">
            {item.item_name}
          </span>
          ? Status akan kembali ke "Belum Diorder".
        </span>
      ),
      type: "confirm",
      action: async () => {
        try {
          const result = await markAsUndone(item.id);
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

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-1 gap-3 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari permintaan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-sm outline-none cursor-pointer hover:bg-accent transition-colors appearance-none pr-10"
            >
              <option value="">Semua Status</option>
              <option value="Belum Diorder">Belum Diorder</option>
              <option value="Sudah Diorder">Sudah Diorder</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
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
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Buat Permintaan
        </button>
      </div>

      {/* Table Desktop View */}
      <TableWrapper className="hidden md:block">
        <TableScrollArea>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                          item.status_order === "Sudah Diorder"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-orange-500/10 text-orange-600 border-orange-500/20",
                        )}
                      >
                        {item.status_order}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.requester_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.division}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.item_name}</p>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline font-medium"
                          >
                            <ExternalLink className="w-3 h-3" /> Buka Tautan
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground">
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Admin Only: Mark as Done / Undone */}
                        {isAdmin && (
                          <>
                            {item.status_order === "Belum Diorder" ? (
                              <button
                                onClick={() => {
                                  setMarkDoneItem(item);
                                  setMarkDoneQuantity(item.quantity.toString());
                                }}
                                className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                title="Tandai Sudah Diorder"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkUndone(item)}
                                className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                                title="Batalkan Order"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                        {/* Re-Order Button - only for items already ordered */}
                        {item.status_order === "Sudah Diorder" && (
                          <button
                            onClick={() => handleReorder(item)}
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                            title="Order Ulang (Buat Baru)"
                          >
                            <CopyPlus className="w-4 h-4" />
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
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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
          )}
        </TableScrollArea>
      </TableWrapper>

      {/* Mobile/Tablet Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                        item.status_order === "Sudah Diorder"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-orange-500/10 text-orange-600 border-orange-500/20",
                      )}
                    >
                      {item.status_order}
                    </span>
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
                      {item.division}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Admin Only: Mark as Done / Undone */}
                    {isAdmin && (
                      <>
                        {item.status_order === "Belum Diorder" ? (
                          <button
                            onClick={() => {
                              setMarkDoneItem(item);
                              setMarkDoneQuantity(item.quantity.toString());
                            }}
                            className="p-2 bg-green-500/10 text-green-600 rounded-lg"
                            title="Tandai Sudah Diorder"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkUndone(item)}
                            className="p-2 bg-orange-500/10 text-orange-600 rounded-lg"
                            title="Batalkan Order"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    {/* Re-Order Button */}
                    {item.status_order === "Sudah Diorder" && (
                      <button
                        onClick={() => handleReorder(item)}
                        className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg"
                        title="Order Ulang"
                      >
                        <CopyPlus className="w-4 h-4" />
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
                      className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 bg-red-500/10 text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm">{item.requester_name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.item_name}
                  </p>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 mt-1 font-medium"
                    >
                      <ExternalLink className="w-3 h-3" /> Buka Tautan
                    </a>
                  )}
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="px-2 py-1 bg-muted rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Qty: {item.quantity}
                  </span>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                Belum ada data permintaan barang.
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchItems(currentPage - 1, search)}
              disabled={currentPage <= 1 || loading}
              className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchItems(currentPage + 1, search)}
              disabled={currentPage >= totalPages || loading}
              className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
              <div>
                <h2 className="font-bold text-lg">
                  {reorderingItem
                    ? "Re-Order Barang"
                    : editingItem
                      ? "Edit Permintaan"
                      : "Permintaan Baru"}
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mt-1">
                  {reorderingItem
                    ? "Buat Permintaan Baru dari Item Sebelumnya"
                    : "Permintaan Pengadaan Barang"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setReorderingItem(null);
                }}
                className="p-2 hover:bg-accent rounded-full transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                          className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[idx].quantity =
                              parseInt(e.target.value) || 1;
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

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setReorderingItem(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold hover:bg-accent rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    "px-8 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50",
                    reorderingItem
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </div>
                  ) : reorderingItem ? (
                    "Buat Order Baru"
                  ) : (
                    "Simpan Permintaan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Done Modal */}
      {markDoneItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  Tandai Sudah Diorder
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Masukkan jumlah yang diorder
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMarkDoneItem(null);
                  setMarkDoneQuantity("");
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Item Info */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Barang:</span>
                  <span className="font-medium">{markDoneItem.item_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pemohon:</span>
                  <span className="font-medium">
                    {markDoneItem.requester_name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Qty Request:</span>
                  <span className="font-bold text-primary">
                    {markDoneItem.quantity}
                  </span>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Jumlah yang Diorder
                </label>
                <input
                  type="number"
                  min="1"
                  value={markDoneQuantity}
                  onChange={(e) => setMarkDoneQuantity(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-center text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Masukkan jumlah..."
                  autoFocus
                />
              </div>
            </div>

            <div className="p-5 border-t border-border flex justify-end gap-3 bg-muted/20">
              <button
                type="button"
                onClick={() => {
                  setMarkDoneItem(null);
                  setMarkDoneQuantity("");
                }}
                className="px-5 py-2.5 text-sm font-bold hover:bg-accent rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleMarkDone}
                disabled={markDoneLoading}
                className="px-8 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {markDoneLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Tandai Selesai
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
