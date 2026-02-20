"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Receipt,
  ExternalLink,
  Package,
  User,
  MapPin,
} from "lucide-react";
import {
  getInvoicesEnglish,
  createInvoiceEnglish,
  updateInvoiceEnglish,
  deleteInvoiceEnglish,
  InvoiceEnglish,
  InvoiceEnglishFormData,
} from "@/app/actions/invoice-english";
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
} from "@/components/ui/table";
import PdfSignatureModal, {
  SignatureType,
} from "@/components/ui/pdf-signature-modal";
import Modal from '@/components/ui/modal'

interface InvoiceEnglishManagerProps {
  initialData?: InvoiceEnglish[];
}

export default function InvoiceEnglishManager({
  initialData = [],
}: InvoiceEnglishManagerProps) {
  const { showConfirmation } = useConfirmation();
  const { showAlert } = useAlert();

  // State
  const [invoices, setInvoices] = useState<InvoiceEnglish[]>(initialData);
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
  const [editingInvoice, setEditingInvoice] = useState<InvoiceEnglish | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<InvoiceEnglishFormData>({
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
    useState<InvoiceEnglish | null>(null);

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
      link.download = `Invoice-${selectedInvoiceForPdf.invoice_number}.pdf`;
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
        const result = await getInvoicesEnglish({
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
          showAlert(result.message || "Failed to fetch data", "error");
        }
      } catch {
        showAlert("An error occurred", "error");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const openEditModal = (invoice: InvoiceEnglish) => {
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
      showAlert("Customer name is required", "error");
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].name.trim()) {
      showAlert("At least one item is required", "error");
      return;
    }

    setSaving(true);
    try {
      const result = editingInvoice
        ? await updateInvoiceEnglish(editingInvoice.id, formData)
        : await createInvoiceEnglish(formData);

      if (result.success) {
        showAlert(result.message || "Success!", "success");
        setIsModalOpen(false);
        fetchInvoices(currentPage, search);
      } else {
        showAlert(result.message || "Failed to save", "error");
      }
    } catch {
      showAlert("An error occurred", "error");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = (invoice: InvoiceEnglish) => {
    showConfirmation({
      title: "Delete Invoice",
      message: `Are you sure you want to delete invoice ${invoice.invoice_number}?`,
      type: "confirm",
      action: async () => {
        try {
          const result = await deleteInvoiceEnglish(invoice.id);
          if (result.success) {
            showAlert("Invoice deleted successfully", "success");
            fetchInvoices(currentPage, search);
          } else {
            showAlert(result.message || "Failed to delete", "error");
          }
        } catch {
          showAlert("An error occurred", "error");
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
    field: keyof InvoiceEnglishFormData["items"][0],
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
  const pageGrandTotal = invoices.reduce((acc, inv) => acc + (inv.grand_total || 0), 0);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Analysis Cards mapping
  const totalNominal = invoices.reduce((acc, inv) => acc + inv.grand_total, 0);
  const averageNominal = invoices.length > 0 ? totalNominal / invoices.length : 0;

  const analysisCards: TableAnalysisCardProps[] = [
    {
      label: "Total Invoice",
      value: total,
      icon: <Receipt className="w-4 h-4" />,
      description: "Total overall English invoices",
    },
    {
      label: "Page Nominal",
      value: formatCurrency(totalNominal).replace("$", "").trim(),
      icon: <div className="text-xs font-bold text-primary">USD</div>,
      description: "Total value on current page",
    },
    {
      label: "Average Value",
      value: formatCurrency(averageNominal).replace("$", "").trim(),
      icon: <div className="text-xs font-bold text-primary">AVG</div>,
      description: "Average on current page",
    },
    {
      label: "Data Status",
      value: "Synced",
      icon: <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />,
      description: "Cloud database connected",
    },
  ];

  return (
    <div className="space-y-6">
      <TableAnalysis cards={analysisCards} />

      <TableWrapper>
        <TableHeaderContent
          title="English Invoices"
          description="Manage international invoices and generate PDFs."
          icon={<Receipt className="w-5 h-5 font-bold text-primary" />}
          actions={
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search invoice..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>
              <button
                onClick={openAddModal}
                className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add Invoice
              </button>
            </div>
          }
        />
        <TableScrollArea>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Notes</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead align="right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-primary">
                        {invoice.invoice_number}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(invoice.invoice_date).toLocaleDateString(
                        "en-US",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
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
                        <span className="text-xs text-muted-foreground/50">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-muted rounded-full text-xs">
                        {invoice.items?.length || 0} item(s)
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
                        title="Download PDF"
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
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableEmpty
                    colSpan={8}
                    icon={<Receipt className="w-12 h-12 opacity-20" />}
                  />
                )}
              </TableBody>
              {invoices.length > 0 && (
                <TableFooter>
                  <TableRow hoverable={false}>
                    <TableCell colSpan={4} className="px-6 py-4 font-bold text-foreground bg-muted/50">
                      TOTAL (This Page)
                    </TableCell>
                    <TableCell className="px-4 py-4 whitespace-nowrap bg-muted/50">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                        {pageTotalItems} Item(s)
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
          )}
        </TableScrollArea>
      </TableWrapper>

      {/* Mobile/Tablet Card View - Premium List */}
      <div className="md:hidden space-y-4" >
        {
          loading ? (
            <div className="flex items-center justify-center py-12" >
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div >
          ) : (
            <>
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="font-mono text-sm font-bold text-primary">
                        {invoice.invoice_number}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(invoice.invoice_date).toLocaleDateString(
                          "en-US",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedInvoiceForPdf(invoice);
                          setIsPdfModalOpen(true);
                        }}
                        className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(invoice)}
                        className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(invoice)}
                        className="p-2 bg-red-500/10 text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm">{invoice.customer_name}</h4>
                    {invoice.customer_address && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {invoice.customer_address}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between items-center">
                    <span className="px-2 py-1 bg-muted rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {invoice.items?.length || 0} item
                    </span>
                    <p className="font-bold text-green-600">
                      {formatCurrency(invoice.grand_total)}
                    </p>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  No invoices found
                </div>
              )}
            </>
          )
        }
      </div >

      {/* Pagination */}
      {
        totalPages > 1 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => fetchInvoices(page, search)}
            totalCount={total}
          />
        )
      }

      {/* Modal */}
      {
        isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingInvoice ? "Edit Invoice" : "Add New Invoice"}
            maxWidth="4xl"
          >
            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1"
            >
              <div className="p-4 overflow-y-auto overscroll-contain flex-1 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      <CalendarIcon className="w-4 h-4 inline mr-1" />
                      Invoice Date
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      <User className="w-4 h-4 inline mr-1" />
                      Customer Name *
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
                      placeholder="Example Company Ltd."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Customer Address
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
                    placeholder="Full customer address..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors resize-none"
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Order Notes
                  </label>
                  <textarea
                    value={formData.order_notes}
                    onChange={(e) =>
                      setFormData({ ...formData, order_notes: e.target.value })
                    }
                    rows={2}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Invoice Items *
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div
                        key={index}
                        className="p-3 bg-muted/30 rounded-lg border border-border"
                      >
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-12 md:col-span-5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                updateItem(index, "name", e.target.value)
                              }
                              placeholder="Item Name"
                              required
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors text-sm"
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
                              placeholder="Price"
                              required
                              min="0"
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors text-sm"
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
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors text-sm"
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
                              className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-colors text-sm"
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
              </div>

              {/* Modal Footer */}
              <div className="p-4 mt-6 border-t border-border shrink-0 bg-muted/20 flex justify-end gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingInvoice ? "Save Changes" : "Create Invoice"}
                </button>
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
        title="Download PDF Invoice"
      />
    </div>
  );
}
