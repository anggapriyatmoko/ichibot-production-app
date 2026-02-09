"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  User,
  MapPin,
  Truck,
  Filter,
  ExternalLink,
} from "lucide-react";
import {
  getResis,
  createResi,
  updateResi,
  deleteResi,
  getCouriers,
  getDefaultSender,
  Resi,
  ResiFormData,
  Courier,
} from "@/app/actions/resi";
import { RESI_STATUS_OPTIONS } from "@/lib/resi-constants";
import { useConfirmation } from "@/components/providers/modal-provider";
import { useAlert } from "@/hooks/use-alert";
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
import PdfPreviewModal from "@/components/ui/pdf-preview-modal";

interface ResiManagerProps {
  initialData?: Resi[];
}

export default function ResiManager({ initialData = [] }: ResiManagerProps) {
  const { showConfirmation } = useConfirmation();
  const { showAlert } = useAlert();

  // State
  const [resis, setResis] = useState<Resi[]>(initialData);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  // Refs for stable function references
  const fetchResisRef = useRef<
    ((page?: number, searchQuery?: string) => Promise<void>) | null
  >(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResi, setEditingResi] = useState<Resi | null>(null);
  const [saving, setSaving] = useState(false);

  // PDF Preview Modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedResiForPdf, setSelectedResiForPdf] = useState<Resi | null>(
    null,
  );

  // Form state
  const [formData, setFormData] = useState<ResiFormData>({
    sender_name: "",
    sender_phone: "",
    sender_address: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    courier_id: null,
    notes: "",
    tracking_number: "",
    status: "pending",
  });

  // Fetch couriers on mount
  useEffect(() => {
    const fetchCouriersData = async () => {
      const result = await getCouriers();
      if (result.success && result.data) {
        setCouriers(result.data);
      }
    };
    fetchCouriersData();
  }, []);

  // Fetch resis
  const fetchResis = useCallback(
    async (page = 1, searchQuery = "") => {
      setLoading(true);
      try {
        const result = await getResis({
          page,
          per_page: 15,
          search: searchQuery || undefined,
          status: statusFilter || undefined,
        });

        if (result.success && result.data) {
          const resisData = result.data.resis || [];
          const paginationData = result.data.pagination;

          setResis(resisData);
          setTotalPages(paginationData?.last_page || 1);
          setTotal(paginationData?.total || 0);
          setCurrentPage(paginationData?.current_page || 1);
        } else {
          // Don't show error alert for common connection issues
          const msg = result.message || "";
          if (
            !msg.includes("fetch failed") &&
            !msg.includes("Failed to fetch")
          ) {
            showAlert(msg || "Gagal mengambil data resi", "error");
          }
          // Still set empty state
          setResis([]);
          setTotal(0);
        }
      } catch (error) {
        console.error("Error fetching resis:", error);
        // Only show alert for non-network errors
        const errorMsg = error instanceof Error ? error.message : "";
        if (!errorMsg.includes("fetch") && !errorMsg.includes("network")) {
          showAlert(errorMsg || "Terjadi kesalahan", "error");
        }
        setResis([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [showAlert, statusFilter],
  );

  // Keep ref updated
  fetchResisRef.current = fetchResis;

  // Initial load - only run once on mount
  useEffect(() => {
    if (initialData.length === 0) {
      fetchResis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when status filter changes
  useEffect(() => {
    fetchResisRef.current?.(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Search with debounce - skip first render
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchResisRef.current?.(1, search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  // Reset form
  const resetForm = async () => {
    // Get default sender from system settings
    const defaultSender = await getDefaultSender();

    setFormData({
      sender_name: defaultSender.name,
      sender_phone: defaultSender.phone,
      sender_address: defaultSender.address,
      receiver_name: "",
      receiver_phone: "",
      receiver_address: "",
      courier_id: null,
      notes: "",
      tracking_number: "",
      status: "pending",
    });
  };

  // Open add modal
  const openAddModal = async () => {
    setEditingResi(null);
    await resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (resi: Resi) => {
    setEditingResi(resi);
    setFormData({
      sender_name: resi.sender.name,
      sender_phone: resi.sender.phone,
      sender_address: resi.sender.address,
      receiver_name: resi.receiver.name,
      receiver_phone: resi.receiver.phone,
      receiver_address: resi.receiver.address,
      courier_id: resi.courier_id,
      notes: resi.notes || "",
      tracking_number: resi.tracking_number || "",
      status: resi.status,
    });
    setIsModalOpen(true);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sender_name.trim()) {
      showAlert("Nama pengirim harus diisi", "error");
      return;
    }

    if (!formData.receiver_name.trim()) {
      showAlert("Nama penerima harus diisi", "error");
      return;
    }

    if (!formData.receiver_address.trim()) {
      showAlert("Alamat penerima harus diisi", "error");
      return;
    }

    setSaving(true);
    try {
      const result = editingResi
        ? await updateResi(editingResi.id, formData)
        : await createResi(formData);

      if (result.success) {
        showAlert(result.message || "Berhasil!", "success");
        setIsModalOpen(false);
        fetchResis(currentPage, search);
      } else {
        showAlert(result.message || "Gagal menyimpan", "error");
      }
    } catch {
      showAlert("Terjadi kesalahan", "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = (resi: Resi) => {
    showConfirmation({
      title: "Hapus Resi",
      message: `Apakah Anda yakin ingin menghapus resi untuk ${resi.receiver.name}?`,
      type: "confirm",
      action: async () => {
        try {
          const result = await deleteResi(resi.id);
          if (result.success) {
            showAlert("Resi berhasil dihapus", "success");
            fetchResis(currentPage, search);
          } else {
            showAlert(result.message || "Gagal menghapus", "error");
          }
        } catch {
          showAlert("Terjadi kesalahan", "error");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Resi</p>
              <p className="text-xl font-bold">{total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari resi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm appearance-none cursor-pointer"
            >
              <option value="">Semua Status</option>
              {RESI_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="shrink-0 px-4 py-2 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Resi</span>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Pengirim</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Kurir</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead align="right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resis.map((resi) => (
                  <TableRow key={resi.id}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-blue-600">
                        #{resi.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[180px]">
                        <p className="font-medium truncate">
                          {resi.sender.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {resi.sender.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate">
                          {resi.receiver.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {resi.receiver.phone}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {resi.receiver.address}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {resi.courier?.service_image_url && (
                          <img
                            src={resi.courier.service_image_url}
                            alt={resi.courier.service_name}
                            className="w-6 h-6 object-contain"
                          />
                        )}
                        <span className="text-sm">
                          {resi.courier?.service_name || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        {new Date(resi.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-2">
                        {resi.pdf_urls?.preview && (
                          <button
                            onClick={() => {
                              setSelectedResiForPdf(resi);
                              setIsPdfModalOpen(true);
                            }}
                            className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                            title="Lihat PDF"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(resi)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(resi)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {resis.length === 0 && (
                  <TableEmpty
                    colSpan={6}
                    icon={<Package className="w-12 h-12 opacity-20" />}
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
            {resis.map((resi) => (
              <div
                key={resi.id}
                className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="font-mono text-sm font-bold text-blue-600">
                      #{resi.id}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(resi)}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(resi)}
                      className="p-2 bg-red-500/10 text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                      Pengirim
                    </p>
                    <p className="font-medium text-sm">{resi.sender.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {resi.sender.phone}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                      Penerima
                    </p>
                    <p className="font-medium text-sm">{resi.receiver.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {resi.receiver.phone}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                    Alamat Tujuan
                  </p>
                  <p className="text-sm">{resi.receiver.address}</p>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {resi.courier?.service_image_url && (
                      <img
                        src={resi.courier.service_image_url}
                        alt={resi.courier.service_name}
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <span className="text-sm font-medium">
                      {resi.courier?.service_name || "Belum dipilih"}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(resi.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {resis.length === 0 && (
              <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                Tidak ada resi ditemukan
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
              onClick={() => fetchResis(currentPage - 1, search)}
              disabled={currentPage <= 1 || loading}
              className="p-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchResis(currentPage + 1, search)}
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
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-lg flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex justify-between items-center bg-blue-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {editingResi ? "Edit Resi" : "Tambah Resi Baru"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {editingResi
                      ? `Mengedit resi #${editingResi.id}`
                      : "Isi data pengiriman di bawah"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6"
            >
              <div className="space-y-6">
                {/* Pengirim Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <User className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-600">
                      Data Pengirim
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Nama Pengirim <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.sender_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sender_name: e.target.value,
                          })
                        }
                        placeholder="Masukkan nama pengirim"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        No. Telepon Pengirim
                      </label>
                      <input
                        type="text"
                        value={formData.sender_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sender_phone: e.target.value,
                          })
                        }
                        placeholder="08xxxxxxxxxx"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Alamat Pengirim
                    </label>
                    <input
                      type="text"
                      value={formData.sender_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender_address: e.target.value,
                        })
                      }
                      placeholder="Masukkan alamat pengirim"
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                {/* Penerima Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-green-600">
                      Data Penerima
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Nama Penerima <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.receiver_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver_name: e.target.value,
                          })
                        }
                        placeholder="Masukkan nama penerima"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        No. Telepon Penerima
                      </label>
                      <input
                        type="text"
                        value={formData.receiver_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            receiver_phone: e.target.value,
                          })
                        }
                        placeholder="08xxxxxxxxxx"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Alamat Penerima <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.receiver_address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          receiver_address: e.target.value,
                        })
                      }
                      placeholder="Masukkan alamat lengkap penerima"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Detail Pengiriman Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Truck className="w-4 h-4 text-purple-500" />
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-purple-600">
                      Detail Pengiriman
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Kurir
                      </label>
                      <select
                        value={formData.courier_id || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            courier_id: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        <option value="">Pilih Kurir</option>
                        {couriers.map((courier) => (
                          <option key={courier.id} value={courier.id}>
                            {courier.service_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        No. Resi / Tracking
                      </label>
                      <input
                        type="text"
                        value={formData.tracking_number || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tracking_number: e.target.value,
                          })
                        }
                        placeholder="Nomor resi pengiriman"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Status
                      </label>
                      <select
                        value={formData.status || "pending"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as ResiFormData["status"],
                          })
                        }
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {RESI_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Catatan
                      </label>
                      <input
                        type="text"
                        value={formData.notes || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Catatan tambahan (optional)"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-3 shrink-0 bg-muted/30">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingResi ? "Simpan Perubahan" : "Tambah Resi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setSelectedResiForPdf(null);
        }}
        resiId={selectedResiForPdf?.id || null}
        title={`Preview Resi #${selectedResiForPdf?.id || ""}`}
      />
    </div>
  );
}
