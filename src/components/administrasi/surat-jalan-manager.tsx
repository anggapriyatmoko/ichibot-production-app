"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Truck,
  Minus,
  Download,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  getSuratJalan,
  createSuratJalan,
  updateSuratJalan,
  deleteSuratJalan,
  generateSuratJalanNumber,
  SuratJalan,
  SuratJalanFormData,
  SuratJalanItem,
} from "@/app/actions/surat-jalan";
import {
  Table,
  TableBody,
  TableFooter,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
  TableScrollArea,
  TableEmpty,
  TablePagination,
  TableHeaderContent,
  TableAnalysis,
  TableAnalysisCardProps,
} from "@/components/ui/table";
import { SignatureType } from "@/components/ui/pdf-signature-modal";
import PdfSignatureModal from "@/components/ui/pdf-signature-modal";
import Modal from "@/components/ui/modal";

interface SuratJalanManagerProps {
  initialData?: SuratJalan[];
  totalCount?: number;
}

export default function SuratJalanManager({
  initialData = [],
  totalCount = 0,
}: SuratJalanManagerProps) {
  const [suratJalanList, setSuratJalanList] =
    useState<SuratJalan[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(totalCount / 15));
  const [total, setTotal] = useState(totalCount);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSJ, setEditingSJ] = useState<SuratJalan | null>(null);
  const [nextNumber, setNextNumber] = useState("");

  // PDF Modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedSJForPdf, setSelectedSJForPdf] = useState<SuratJalan | null>(
    null,
  );

  const [formData, setFormData] = useState<SuratJalanFormData>({
    sj_date: new Date().toISOString().split("T")[0],
    name: "",
    phone: "",
    address: "",
    expedition: "",
    notes: "",
    items: [{ item_name: "", qty: 1, unit: "pcs", notes: "" }],
  });

  const fetchSJ = useCallback(async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const result = await getSuratJalan(page, searchQuery);
      setSuratJalanList(result.data);
      setTotalPages(result.meta?.last_page || 1);
      setCurrentPage(result.meta?.current_page || 1);
      setTotal(result.meta?.total || 0);
    } catch (error) {
      console.error("Failed to fetch surat jalan:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSJ();
  }, [fetchSJ]);

  const handleSearch = (val: string) => {
    setSearch(val);
    const timer = setTimeout(() => fetchSJ(1, val), 500);
    return () => clearTimeout(timer);
  };

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

  const openAddModal = async () => {
    setEditingSJ(null);
    setFormData({
      sj_date: new Date().toISOString().split("T")[0],
      name: "",
      phone: "",
      address: "",
      expedition: "",
      notes: "",
      items: [{ item_name: "", qty: 1, unit: "pcs", notes: "" }],
    });

    try {
      const num = await generateSuratJalanNumber();
      setNextNumber(num);
    } catch (e) {
      console.error(e);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (sj: SuratJalan) => {
    setEditingSJ(sj);
    setFormData({
      sj_date: sj.sj_date,
      name: sj.name,
      phone: sj.phone || "",
      address: sj.address,
      expedition: sj.expedition || "",
      notes: sj.notes || "",
      items: sj.items.map((item) => ({ ...item })),
    });
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_name: "", qty: 1, unit: "pcs", notes: "" },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = [...formData.items];
      newItems.splice(index, 1);
      setFormData({ ...formData, items: newItems });
    }
  };

  const updateItem = (
    index: number,
    field: keyof SuratJalanItem,
    value: string | number,
  ) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    if (field === "qty") {
      item.qty = Number(value);
    } else {
      (item as any)[field] = value;
    }
    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = editingSJ
        ? await updateSuratJalan(editingSJ.id, formData)
        : await createSuratJalan(formData);

      if (result.success) {
        setIsModalOpen(false);
        fetchSJ(currentPage, search);
      } else {
        alert(result.error || "Gagal menyimpan data");
      }
    } catch (error) {
      console.error("Error saving SJ:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus surat jalan ini?")) {
      try {
        await deleteSuratJalan(id);
        fetchSJ(currentPage, search);
      } catch (error) {
        console.error("Error deleting SJ:", error);
      }
    }
  };

  const handlePdfDownload = async (signatureType: SignatureType) => {
    if (!selectedSJForPdf || !selectedSJForPdf.pdf_urls) return;

    let externalUrl = selectedSJForPdf.pdf_urls.secure_download;

    if (signatureType === "none") {
      externalUrl += (externalUrl.includes("?") ? "&" : "?") + "signature=none";
    } else if (signatureType === "qr") {
      externalUrl += (externalUrl.includes("?") ? "&" : "?") + "qr_code=1";
    }

    const proxyUrl = `/api/download-pdf?url=${encodeURIComponent(externalUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeNo = selectedSJForPdf.sj_number.replace(/[/\\?%*:|"<>]/g, "-");
      link.download = `SuratJalan-${safeNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF Download failed:", error);
      alert("Gagal mengunduh PDF");
    }
  };

  // Analysis Cards mapping
  const shippingThisMonth = suratJalanList.filter((sj) => {
    const d = new Date(sj.sj_date);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const analysisCards: TableAnalysisCardProps[] = [
    {
      label: "Total Surat Jalan",
      value: total,
      icon: <Truck className="w-4 h-4" />,
      description: "Total keseluruhan pengiriman",
    },
    {
      label: "Bulan Ini",
      value: shippingThisMonth,
      icon: <CalendarIcon className="w-4 h-4" />,
      description: "Pengiriman dilakukan bulan ini",
    },
    {
      label: "Status Logistik",
      value: "Lancar",
      icon: <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />,
      description: "Operasional pengiriman aktif",
    },
    {
      label: "Sistem",
      value: "Terhubung",
      icon: <div className="w-2 h-2 rounded-full bg-blue-500" />,
      description: "Database sinkron",
    },
  ];

  return (
    <div className="space-y-6">
      <TableAnalysis cards={analysisCards} />

      <TableWrapper>
        <TableHeaderContent
          title="Surat Jalan"
          description="Kelola pengiriman barang dan cetak surat jalan resmi."
          icon={<Truck className="w-5 h-5 font-bold text-primary" />}
          actions={
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari surat jalan..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:border-primary outline-none transition-all shadow-sm"
                />
              </div>
              <button
                onClick={openAddModal}
                className="px-4 h-9 bg-primary text-primary-foreground rounded-lg text-sm font-bold transition-all hover:bg-primary/90 shadow-sm flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Buat Surat Jalan
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
                  <TableHead>No. SJ</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Expedisi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead align="right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suratJalanList.map((sj) => (
                  <TableRow key={sj.id}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {sj.sj_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{sj.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {sj.phone || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p
                        className="text-xs truncate max-w-[200px]"
                        title={sj.address}
                      >
                        {sj.address}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium text-muted-foreground">
                        {sj.expedition || "Internal"}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(sj.sj_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => {
                          setSelectedSJForPdf(sj);
                          setIsPdfModalOpen(true);
                        }}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEditModal(sj)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(sj.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {suratJalanList.length === 0 && (
                  <TableEmpty
                    colSpan={7}
                    message="Belum ada data surat jalan."
                  />
                )}
              </TableBody>
              {suratJalanList.length > 0 && (
                <TableFooter>
                  <TableRow hoverable={false}>
                    <TableCell colSpan={7} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Surat Jalan:</span>
                        <span className="text-sm font-bold text-primary">{suratJalanList.length} Dokumen</span>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </TableScrollArea>
      </TableWrapper>

      {/* Mobile/Tablet Card View - Premium List */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {suratJalanList.map((sj) => (
              <div
                key={sj.id}
                className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="font-mono text-sm font-bold text-blue-600 uppercase">
                      {sj.sj_number}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sj.sj_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedSJForPdf(sj);
                        setIsPdfModalOpen(true);
                      }}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(sj)}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sj.id)}
                      className="p-2 bg-red-500/10 text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm tracking-tight">
                    {sj.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">
                    {sj.address}
                  </p>
                </div>

                {sj.items && sj.items.length > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Barang
                      </span>
                      <span className="text-[10px] font-bold text-blue-600">
                        {sj.items.length} Item
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {sj.items.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-[11px]"
                        >
                          <span className="text-gray-700 font-medium truncate flex-1 mr-2">
                            {item.item_name}
                          </span>
                          <span className="text-gray-500 shrink-0">
                            {item.qty} {item.unit}
                          </span>
                        </div>
                      ))}
                      {sj.items.length > 2 && (
                        <p className="text-[9px] text-muted-foreground italic pt-1 text-center">
                          +{sj.items.length - 2} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {sj.expedition || "Tanpa Ekspedisi"}
                  </span>
                </div>
              </div>
            ))}
            {suratJalanList.length === 0 && (
              <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                Belum ada data surat jalan.
              </div>
            )}
          </>
        )}
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => fetchSJ(page, search)}
        totalCount={total}
      />

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingSJ ? "Edit Surat Jalan" : "Buat Surat Jalan Baru"}
          maxWidth="4xl"
        >
          <div className="flex flex-col flex-1 h-full">
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto overscroll-contain p-8 custom-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Information Section */}
                <div className="space-y-6">
                  {/* SJ Number Banner */}
                  <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                    <div className="flex items-center gap-3 mb-1 opactiy-80">
                      <Truck className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Nomor Surat Jalan
                      </span>
                    </div>
                    <div className="text-2xl font-mono font-bold">
                      {editingSJ
                        ? editingSJ.sj_number
                        : nextNumber || "AUTO-GENERATING..."}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Nama Penerima
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        placeholder="Nama lengkap penerima..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Nomor Telepon
                        </label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          placeholder="08XXX..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Tanggal
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.sj_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              sj_date: e.target.value,
                            })
                          }
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-gray-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Alamat Tujuan
                      </label>
                      <textarea
                        required
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none min-h-[100px] resize-none"
                        placeholder="Alamat lengkap pengiriman..."
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Expedisi / Kurir
                      </label>
                      <input
                        type="text"
                        value={formData.expedition}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expedition: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        placeholder="Contoh: JNE, J&T, Internal, dll."
                      />
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between ml-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Daftar Barang
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                    >
                      + Tambah Item
                    </button>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {formData.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="group bg-gray-50 border border-gray-100 p-4 rounded-2xl space-y-3 relative hover:border-blue-200 transition-all"
                      >
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nama atau Kode Barang"
                            required
                            value={item.item_name}
                            onChange={(e) =>
                              updateItem(idx, "item_name", e.target.value)
                            }
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                          />
                          <div className="flex gap-2 w-32">
                            <input
                              type="number"
                              required
                              value={item.qty}
                              onChange={(e) =>
                                updateItem(idx, "qty", e.target.value)
                              }
                              className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs font-bold text-center outline-none focus:border-blue-500"
                            />
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                updateItem(idx, "unit", e.target.value)
                              }
                              className="w-12 bg-white border border-gray-200 rounded-lg px-1 py-2 text-[10px] font-bold text-center text-gray-400 outline-none focus:border-blue-500"
                              placeholder="pcs"
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Keterangan (opsional)"
                          value={item.notes}
                          onChange={(e) =>
                            updateItem(idx, "notes", e.target.value)
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-[10px] font-medium outline-none focus:border-blue-500"
                        />
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-100 shrink-0">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                      Catatan Tambahan
                    </label>
                    <textarea
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 text-xs font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none min-h-[80px] resize-none"
                      placeholder="Catatan untuk pengiriman..."
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-white hover:text-gray-700 transition-all border border-transparent hover:border-gray-200"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingSJ ? "Perbarui" : "Buat Surat Jalan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PDF Modal */}
      {isPdfModalOpen && selectedSJForPdf && (
        <PdfSignatureModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          onDownload={handlePdfDownload}
          title="Unduh Surat Jalan"
          variant="ichibot"
        />
      )}
    </div>
  );
}
