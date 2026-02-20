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
  TableHeaderContent,
  TablePagination,
} from "@/components/ui/table";
import PdfPreviewModal from "@/components/ui/pdf-preview-modal";
import Modal from "@/components/ui/modal";

interface ResiManagerProps {
  initialData?: Resi[];
  initialPagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export default function ResiManager({
  initialData = [],
  initialPagination,
}: ResiManagerProps) {
  const { showConfirmation } = useConfirmation();
  const { showAlert } = useAlert();

  // State
  const [resis, setResis] = useState<Resi[]>(initialData);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(
    initialPagination?.current_page || 1,
  );
  const [totalPages, setTotalPages] = useState(initialPagination?.last_page || 1);
  const [total, setTotal] = useState(
    initialPagination?.total || initialData.length,
  );
  const [itemsPerPage, setItemsPerPage] = useState(
    initialPagination?.per_page || 15,
  );
  const [statusFilter, setStatusFilter] = useState("");

  // Refs for stable function references
  const fetchResisRef = useRef<
    ((page?: number, searchQuery?: string, status?: string) => Promise<void>) | null
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
    async (page = 1, searchQuery = "", status = statusFilter) => {
      setLoading(true);
      try {
        const result = await getResis({
          page,
          per_page: itemsPerPage,
          search: searchQuery || undefined,
          status: status || undefined,
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
    [showAlert, statusFilter, itemsPerPage],
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
    fetchResisRef.current?.(1, search, statusFilter);
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
      fetchResisRef.current?.(1, search, statusFilter);
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
    <>
      <TableWrapper loading={loading}>
        <TableHeaderContent
          title={
            <div className="flex items-center gap-3">
              <span>Daftar Resi</span>
              <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <Package className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-700">
                  {total} Total
                </span>
              </div>
            </div>
          }
          description="Kelola data resi pengiriman Anda"
          actions={
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari resi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm"
                />
              </div>
              <div className="relative w-full sm:w-44">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm appearance-none cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  {RESI_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </div>
          }
        />

        <TableScrollArea>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">
                  Memuat data...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30" hoverable={false}>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Pengirim</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Kurir</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead align="right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resis.map((resi) => (
                      <TableRow key={resi.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell>
                          <span className="font-mono text-sm font-medium text-blue-600">
                            #{resi.id}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[180px]">
                            <p className="text-sm font-medium text-foreground truncate">
                              {resi.sender.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {resi.sender.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="text-sm font-medium text-foreground truncate">
                              {resi.receiver.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {resi.receiver.phone}
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {resi.receiver.address}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {resi.courier?.service_image_url && (
                              <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center p-0.5 border border-border">
                                <img
                                  src={resi.courier.service_image_url}
                                  alt={resi.courier.service_name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                            )}
                            <span className="text-xs font-medium text-foreground">
                              {resi.courier?.service_name || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {new Date(resi.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {resi.pdf_urls?.preview && (
                              <button
                                onClick={() => {
                                  setSelectedResiForPdf(resi);
                                  setIsPdfModalOpen(true);
                                }}
                                className="p-2 text-green-600 hover:bg-green-500/10 rounded-lg transition-colors border border-transparent hover:border-green-500/20"
                                title="Lihat PDF"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(resi)}
                              className="p-2 text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(resi)}
                              className="p-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden divide-y divide-border">
                {resis.map((resi) => (
                  <div key={resi.id} className="p-4 space-y-3 bg-card hover:bg-muted/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-blue-600">
                          #{resi.id}
                        </span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-tight">
                          {new Date(resi.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {resi.pdf_urls?.preview && (
                          <button
                            onClick={() => {
                              setSelectedResiForPdf(resi);
                              setIsPdfModalOpen(true);
                            }}
                            className="p-2 text-green-600 bg-green-500/10 rounded-lg"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(resi)}
                          className="p-2 text-blue-600 bg-blue-500/10 rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(resi)}
                          className="p-2 text-red-600 bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                          Pengirim
                        </p>
                        <p className="font-medium text-xs text-foreground truncate">{resi.sender.name}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                          Penerima
                        </p>
                        <p className="font-medium text-xs text-foreground truncate">{resi.receiver.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        {resi.courier?.service_image_url && (
                          <img
                            src={resi.courier.service_image_url}
                            alt={resi.courier.service_name}
                            className="w-4 h-4 object-contain"
                          />
                        )}
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {resi.courier?.service_name || "Belum dipilih"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {resis.length === 0 && (
                <TableEmpty
                  colSpan={6}
                  icon={<Package className="w-10 h-10 opacity-20" />}
                  message="Tidak ada resi"
                  description="Mulai dengan menambah resi baru"
                />
              )}
            </>
          )}
        </TableScrollArea>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={total}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => fetchResis(page, search, statusFilter)}
          onItemsPerPageChange={(count) => {
            setItemsPerPage(count);
            fetchResis(1, search, statusFilter);
          }}
        />
      </TableWrapper>

      {/* Modal */}
      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingResi ? "Edit Resi" : "Tambah Resi Baru"}
          maxWidth="2xl"
        >
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-3 shrink-0 bg-muted/30 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-border rounded-xl font-medium hover:bg-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingResi ? "Simpan Perubahan" : "Tambah Resi"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setSelectedResiForPdf(null);
        }}
        resiId={selectedResiForPdf?.id ?? null}
        title={`Preview Resi #${selectedResiForPdf?.id || ""}`}
      />
    </>
  );
}
