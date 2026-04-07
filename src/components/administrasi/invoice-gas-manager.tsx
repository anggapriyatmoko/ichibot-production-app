"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Calendar as CalendarIcon,
  Receipt,
  ExternalLink,
  Package,
  User,
  MapPin,
} from "lucide-react";
import {
  getInvoicesGAS,
  createInvoiceGAS,
  updateInvoiceGAS,
  deleteInvoiceGAS,
  InvoiceGAS,
  InvoiceGASFormData,
} from "@/app/actions/invoice-gas";
import { useConfirmation } from "@/components/providers/modal-provider";
import { useAlert } from "@/hooks/use-alert";
import {
  TableWrapper,
  TableScrollArea,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TablePagination,
  TableHeaderContent,
  TableAnalysis,
  TableAnalysisCardProps,
  TableResponsive,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileCardContent,
  TableMobileCardFooter,
} from "@/components/ui/table";
import PdfSignatureModal, {
  SignatureType,
} from "@/components/ui/pdf-signature-modal";
import Modal from '@/components/ui/modal'

interface InvoiceGASManagerProps {
  initialData?: InvoiceGAS[];
}

export default function InvoiceGASManager({
  initialData = [],
}: InvoiceGASManagerProps) {
  const { showConfirmation } = useConfirmation();
  const { showAlert } = useAlert();

  // State
  const [invoices, setInvoices] = useState<InvoiceGAS[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Refs for stable function references
  const fetchInvoicesRef = useRef<
    ((page?: number, searchQuery?: string) => Promise<void>) | null
  >(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceGAS | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<InvoiceGASFormData>({
    invoice_date: new Date().toISOString().split("T")[0],
    customer_name: "",
    customer_address: "",
    order_notes: "",
    po_number: "",
    svo_number: "",
    do_number: "",
    items: [{ name: "", price: 0, quantity: 1, unit: "pcs" }],
  });

  // PDF Modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedInvoiceForPdf, setSelectedInvoiceForPdf] =
    useState<InvoiceGAS | null>(null);

  // Handle PDF download with signature type
  const handlePdfDownload = async (signatureType: SignatureType) => {
    if (!selectedInvoiceForPdf) return;

    // Build PDF download URL based on signature type
    const baseDownloadUrl =
      selectedInvoiceForPdf.pdf_urls?.secure_download?.split("?")[0] || "";
    const externalUrl = `${baseDownloadUrl}?signature=${signatureType}`;

    // Use local API proxy to avoid CORS
    const proxyUrl = `/api/download-pdf?url=${encodeURIComponent(externalUrl)}`;

    try {
      // Fetch the PDF through our proxy
      const response = await fetch(proxyUrl);

      // Jika gagal, baca errornya
      if (!response.ok) {
        const errorData = await response.json();
        alert(
          `Gagal mengunduh: ${errorData.error}\n${errorData.details || ""}`,
        );
        return;
      }

      // Pastikan response adalah PDF
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/pdf")) {
        console.error("Received non-PDF response:", contentType);
        alert("Server tidak mengembalikan file PDF. Silakan coba lagi nanti.");
        return;
      }

      const blob = await response.blob();

      // Create object URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Invoice-GAS-${selectedInvoiceForPdf.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Terjadi kesalahan teknis saat mengunduh PDF.");
    }
  };

  // Fetch invoices
  const fetchInvoices = useCallback(
    async (page = 1, searchQuery = "") => {
      setLoading(true);
      try {
        const result = await getInvoicesGAS({
          page,
          per_page: 15,
          search: searchQuery || undefined,
        });

        if (result.success && result.data) {
          // Handle nested data structure - API returns { data: { invoices, pagination } }
          const invoicesData = result.data.invoices || [];
          const paginationData = result.data.pagination;

          setInvoices(invoicesData);
          setTotalPages(paginationData?.last_page || 1);
          setTotal(paginationData?.total || 0);
          setCurrentPage(paginationData?.current_page || 1);
        } else {
          showAlert(result.message || "Gagal mengambil data", "error");
        }
      } catch {
        showAlert("Terjadi kesalahan", "error");
      } finally {
        setLoading(false);
      }
    },
    [showAlert],
  );

  // Keep ref updated
  fetchInvoicesRef.current = fetchInvoices;

  // Initial load - only run once on mount
  useEffect(() => {
    if (initialData.length === 0) {
      fetchInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search with debounce - skip first render
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchInvoicesRef.current?.(1, search);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [search]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Reset form
  const resetForm = () => {
    setFormData({
      invoice_date: new Date().toISOString().split("T")[0],
      customer_name: "",
      customer_address: "",
      order_notes: "",
      po_number: "",
      svo_number: "",
      do_number: "",
      items: [{ name: "", price: 0, quantity: 1, unit: "pcs" }],
    });
  };

  // Open add modal
  const openAddModal = () => {
    setEditingInvoice(null);
    resetForm();
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (invoice: InvoiceGAS) => {
    setEditingInvoice(invoice);
    setFormData({
      invoice_date: invoice.invoice_date.split("T")[0],
      customer_name: invoice.customer_name,
      customer_address: invoice.customer_address || "",
      order_notes: invoice.order_notes || "",
      po_number: invoice.po_number || "",
      svo_number: invoice.svo_number || "",
      do_number: invoice.do_number || "",
      items: invoice.items.map((item) => ({
        name: item.item_name || item.name || "",
        price: item.price,
        quantity: item.quantity,
        unit: item.unit,
      })),
    });
    setIsModalOpen(true);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name.trim()) {
      showAlert("Nama customer harus diisi", "error");
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].name.trim()) {
      showAlert("Minimal satu item harus diisi", "error");
      return;
    }

    setSaving(true);
    try {
      const result = editingInvoice
        ? await updateInvoiceGAS(editingInvoice.id, formData)
        : await createInvoiceGAS(formData);

      if (result.success) {
        showAlert(result.message || "Berhasil!", "success");
        setIsModalOpen(false);
        fetchInvoices(currentPage, search);
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
  const handleDelete = (invoice: InvoiceGAS) => {
    showConfirmation({
      title: "Hapus Invoice",
      message: `Apakah Anda yakin ingin menghapus invoice ${invoice.invoice_number}?`,
      type: "confirm",
      action: async () => {
        try {
          const result = await deleteInvoiceGAS(invoice.id);
          if (result.success) {
            showAlert("Invoice berhasil dihapus", "success");
            fetchInvoices(currentPage, search);
          } else {
            showAlert(result.message || "Gagal menghapus", "error");
          }
        } catch {
          showAlert("Terjadi kesalahan", "error");
        }
      },
    });
  };

  // Item management
  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { name: "", price: 0, quantity: 1, unit: "pcs" },
      ],
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    }
  };

  const updateItem = (
    index: number,
    field: keyof InvoiceGASFormData["items"][0],
    value: string | number,
  ) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  // Calculate grand total
  const grandTotal = formData.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  // Calculate current page totals
  const pageTotalItems = invoices.reduce((acc, inv) => acc + (inv.items?.length || 0), 0);
  const pageGrandTotal = invoices.reduce((acc, inv) => acc + (Number(inv.grand_total) || 0), 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Analysis Cards mapping
  const totalNominal = invoices.reduce((acc, inv) => acc + (Number(inv.grand_total) || 0), 0);
  const averageNominal = invoices.length > 0 ? totalNominal / invoices.length : 0;

  const analysisCards: TableAnalysisCardProps[] = [
    {
      label: "Total Invoice GAS",
      value: total,
      icon: <Receipt className="w-4 h-4" />,
      description: "Total keseluruhan invoice GAS",
    },
    {
      label: "Nominal Halaman",
      value: formatCurrency(totalNominal).replace("Rp", "").trim(),
      icon: <div className="text-xs font-bold text-purple-600">IDR</div>,
      description: "Total nilai pada halaman ini",
    },
    {
      label: "Rata-rata Nilai",
      value: formatCurrency(averageNominal).replace("Rp", "").trim(),
      icon: <div className="text-xs font-bold text-purple-600">AVG</div>,
      description: "Rata-rata per invoice",
    },
    {
      label: "Status Data",
      value: "Sinkron",
      icon: <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />,
      description: "Terhubung ke database GAS",
    },
  ];

  return (
    <div className="space-y-6">
      <TableResponsive
        data={invoices}
        loading={loading}
        header={
          <TableHeaderContent
            title="Invoice GAS"
            description="Kelola invoice khusus GAS dan cetak PDF dengan tanda tangan."
            icon={<Receipt className="w-5 h-5 font-bold text-purple-600" />}
            actions={
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cari invoice GAS..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-purple-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <button
                  onClick={openAddModal}
                  className="px-4 h-9 bg-purple-500 text-white rounded-lg text-sm font-bold transition-all hover:bg-purple-600 shadow-sm flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Invoice
                </button>
              </div>
            }
          />
        }
        renderMobileCard={(invoice) => (
          <TableMobileCard key={invoice.id}>
            <TableMobileCardHeader>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-purple-600">
                  {invoice.invoice_number}
                </span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-tight">
                  {new Date(invoice.invoice_date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setSelectedInvoiceForPdf(invoice);
                    setIsPdfModalOpen(true);
                  }}
                  className="p-2 text-blue-600 bg-blue-500/10 rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openEditModal(invoice)}
                  className="p-2 text-blue-600 bg-blue-500/10 rounded-lg"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(invoice)}
                  className="p-2 text-red-600 bg-red-500/10 rounded-lg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </TableMobileCardHeader>

            <TableMobileCardContent>
              <div className="space-y-0.5">
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                  Customer
                </p>
                <p className="font-medium text-xs text-foreground truncate">
                  {invoice.customer_name}
                </p>
              </div>
              <div className="space-y-0.5 text-right">
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                  Status
                </p>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold">
                  {invoice.items?.length || 0} items
                </span>
              </div>
            </TableMobileCardContent>

            <TableMobileCardFooter>
              <div className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground truncate">
                  {invoice.customer_address || "No address"}
                </span>
              </div>
              <p className="font-bold text-sm text-green-600">
                {formatCurrency(invoice.grand_total)}
              </p>
            </TableMobileCardFooter>
          </TableMobileCard>
        )}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Catatan Order</TableHead>
              <TableHead>Items</TableHead>
              <TableHead align="right">Total</TableHead>
              <TableHead>PDF</TableHead>
              <TableHead align="right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableEmpty
                colSpan={8}
                icon={<Receipt className="w-12 h-12 opacity-20" />}
              />
            ) : (
              invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <span className="font-mono text-sm font-medium text-purple-600">
                      {invoice.invoice_number}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(invoice.invoice_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.customer_name}</p>
                      {invoice.customer_address && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {invoice.customer_address}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {invoice.order_notes ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                        {invoice.order_notes}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                      {invoice.items?.length || 0} item
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className="font-semibold text-green-600">
                      {formatCurrency(invoice.grand_total)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => {
                        setSelectedInvoiceForPdf(invoice);
                        setIsPdfModalOpen(true);
                      }}
                      className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors inline-flex"
                      title="Unduh PDF"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(invoice)}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(invoice)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {invoices.length > 0 && (
            <TableFooter>
              <TableRow hoverable={false}>
                <TableCell colSpan={4} className="px-6 py-4 font-bold text-foreground bg-muted/50">
                  TOTAL (Halaman Ini)
                </TableCell>
                <TableCell className="px-4 py-4 whitespace-nowrap bg-muted/50">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">
                    {pageTotalItems} Item
                  </span>
                </TableCell>
                <TableCell align="right" className="px-4 py-4 bg-muted/50">
                  <span className="font-bold text-green-600 tabular-nums">
                    {formatCurrency(pageGrandTotal)}
                  </span>
                </TableCell>
                <TableCell className="bg-muted/50" />
                <TableCell className="bg-muted/50" />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableResponsive>

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => fetchInvoices(page, search)}
          totalCount={total}
        />
      )}

      <TableAnalysis cards={analysisCards} className="mt-6" />

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            <span className="text-purple-700">
              {editingInvoice
                ? "Edit Invoice GAS"
                : "Tambah Invoice GAS Baru"}
            </span>
          }
          maxWidth="4xl"
          footer={
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="invoice-gas-form"
                disabled={saving}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingInvoice ? "Simpan Perubahan" : "Buat Invoice GAS"}
              </button>
            </div>
          }
        >
          <form
            id="invoice-gas-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Tanggal Invoice
                  </label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_date: e.target.value,
                      })
                    }
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Nama Customer *
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer_name: e.target.value,
                      })
                    }
                    required
                    placeholder="PT. Example Company"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Alamat Customer
                </label>
                <textarea
                  value={formData.customer_address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      customer_address: e.target.value,
                    })
                  }
                  rows={2}
                  placeholder="Alamat lengkap customer..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              {/* Reference Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    value={formData.po_number}
                    onChange={(e) =>
                      setFormData({ ...formData, po_number: e.target.value })
                    }
                    placeholder="PO-XXX"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    SVO Number
                  </label>
                  <input
                    type="text"
                    value={formData.svo_number}
                    onChange={(e) =>
                      setFormData({ ...formData, svo_number: e.target.value })
                    }
                    placeholder="SVO-XXX"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    DO Number
                  </label>
                  <input
                    type="text"
                    value={formData.do_number}
                    onChange={(e) =>
                      setFormData({ ...formData, do_number: e.target.value })
                    }
                    placeholder="DO-XXX"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Catatan Pesanan
              </label>
              <textarea
                value={formData.order_notes}
                onChange={(e) =>
                  setFormData({ ...formData, order_notes: e.target.value })
                }
                rows={2}
                placeholder="Catatan tambahan..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-500" />
                  Item Invoice *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs px-3 py-1 bg-purple-500/10 text-purple-600 rounded-lg hover:bg-purple-500/20 transition-colors"
                >
                  + Tambah Item
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-purple-50/50 rounded-lg border border-purple-200"
                  >
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 md:col-span-5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            updateItem(index, "name", e.target.value)
                          }
                          placeholder="Nama Item"
                          required
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors text-sm"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "price",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="Harga"
                          required
                          min="0"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors text-sm"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseFloat(e.target.value) || 1,
                            )
                          }
                          placeholder="Qty"
                          required
                          min="0.01"
                          step="0.01"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors text-sm"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            updateItem(index, "unit", e.target.value)
                          }
                          placeholder="Unit"
                          required
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-purple-500 transition-colors text-sm"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1 flex items-center justify-center">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-right text-sm text-muted-foreground">
                      Subtotal:{" "}
                      <span className="font-medium text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grand Total */}
              <div className="flex justify-end pt-3 border-t border-border">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Grand Total
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* PDF Signature Modal */}
      <PdfSignatureModal
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setSelectedInvoiceForPdf(null);
        }}
        onDownload={handlePdfDownload}
        title="Unduh PDF Invoice GAS"
        variant="gas"
        pdfUrl={selectedInvoiceForPdf?.pdf_urls?.secure_download?.split("?")[0]}
      />
    </div>
  );
}
