"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  FileText,
  Minus,
  Download,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  getSuratTugas,
  createSuratTugas,
  updateSuratTugas,
  deleteSuratTugas,
  generateSuratTugasNumber,
  SuratTugas,
  SuratTugasFormData,
} from "@/app/actions/surat-tugas";
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

interface SuratTugasManagerProps {
  initialData?: SuratTugas[];
  totalCount?: number;
}

export default function SuratTugasManager({
  initialData = [],
  totalCount = 0,
}: SuratTugasManagerProps) {
  const [suratTugasList, setSuratTugasList] =
    useState<SuratTugas[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(Math.ceil(totalCount / 15));
  const [total, setTotal] = useState(totalCount);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingST, setEditingST] = useState<SuratTugas | null>(null);

  // PDF Modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedSTForPdf, setSelectedSTForPdf] = useState<SuratTugas | null>(
    null,
  );

  const [formData, setFormData] = useState<SuratTugasFormData>({
    instansi: "ICHI",
    letter_no: "",
    title: "",
    details: "",
    signer_name: "Yulian Ardianto",
    signer_title: "CEO & Founder",
    company_name: "PT. Ichibot Teknologi Indonesia",
    company_address: "Jl. Mojosari No. 1, Yogyakarta",
    issue_place: "Yogyakarta",
    issue_date: new Date().toISOString().split("T")[0],
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    peserta: [{ nama: "", jabatan: "" }],
  });

  const fetchST = useCallback(async (page = 1, searchQuery = "") => {
    setLoading(true);
    try {
      const result = await getSuratTugas(page, searchQuery);
      setSuratTugasList(result.data);
      setTotalPages(result.meta?.last_page || 1);
      setCurrentPage(result.meta?.current_page || 1);
      setTotal(result.meta?.total || 0);
    } catch (error) {
      console.error("Failed to fetch surat tugas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchST();
  }, [fetchST]);

  // Auto generate number when instansi or date changes
  useEffect(() => {
    const fetchNextNumber = async () => {
      if (!editingST && isModalOpen) {
        try {
          const number = await generateSuratTugasNumber(
            formData.instansi,
            formData.start_date,
          );
          setFormData((prev) => ({ ...prev, letter_no: number }));
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchNextNumber();
  }, [formData.instansi, formData.start_date, editingST, isModalOpen]);

  const handleSearch = (val: string) => {
    setSearch(val);
    const timer = setTimeout(() => fetchST(1, val), 500);
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

  const openAddModal = () => {
    setEditingST(null);
    setFormData({
      instansi: "ICHI",
      letter_no: "",
      title: "",
      details: "",
      signer_name: "Yulian Ardianto",
      signer_title: "CEO & Founder",
      company_name: "PT. Ichibot Teknologi Indonesia",
      company_address: "Jl. Mojosari No. 1, Yogyakarta",
      issue_place: "Yogyakarta",
      issue_date: new Date().toISOString().split("T")[0],
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      peserta: [{ nama: "", jabatan: "" }],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (st: SuratTugas) => {
    setEditingST(st);
    setFormData({
      instansi: st.instansi,
      letter_no: st.letter_no,
      title: st.title,
      details: st.details,
      signer_name: st.signer_name,
      signer_title: st.signer_title,
      company_name: st.company_name,
      company_address: st.company_address,
      issue_place: st.issue_place,
      issue_date: st.issue_date,
      start_date: st.start_date,
      end_date: st.end_date,
      peserta: st.peserta?.map((p) => ({
        nama: p.nama,
        jabatan: p.jabatan,
      })) || [{ nama: "", jabatan: "" }],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = editingST
        ? await updateSuratTugas(editingST.id, formData)
        : await createSuratTugas(formData);

      if (result.success) {
        setIsModalOpen(false);
        fetchST(currentPage, search);
      } else {
        alert(result.error || "Gagal menyimpan data");
      }
    } catch (error) {
      console.error("Error saving ST:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus surat tugas ini?")) {
      try {
        await deleteSuratTugas(id);
        fetchST(currentPage, search);
      } catch (error) {
        console.error("Error deleting ST:", error);
      }
    }
  };

  const handlePdfDownload = async (signatureType: SignatureType) => {
    if (!selectedSTForPdf || !selectedSTForPdf.pdf_urls) return;

    let externalUrl = "";
    const pdfUrls = selectedSTForPdf.pdf_urls;

    if (signatureType === "none") {
      externalUrl =
        selectedSTForPdf.instansi === "GAN"
          ? pdfUrls.secure_download
          : pdfUrls.secure_download_ichibot;
      // In CI-Generate, plain might need a query param, but let's use the standard one for now
      externalUrl += (externalUrl.includes("?") ? "&" : "?") + "signature=none";
    } else if (signatureType === "qr") {
      externalUrl =
        selectedSTForPdf.instansi === "GAN"
          ? pdfUrls.secure_qr_download
          : pdfUrls.secure_qr_download_ichibot;
    } else {
      // Default / Signature
      externalUrl =
        selectedSTForPdf.instansi === "GAN"
          ? pdfUrls.secure_download
          : pdfUrls.secure_download_ichibot;
    }

    const proxyUrl = `/api/download-pdf?url=${encodeURIComponent(externalUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeNo = selectedSTForPdf.letter_no.replace(/[/\\?%*:|"<>]/g, "-");
      link.download = `SuratTugas-${safeNo}.pdf`;
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
  const activeThisMonth = suratTugasList.filter((st) => {
    const d = new Date(st.start_date);
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }).length;

  const analysisCards: TableAnalysisCardProps[] = [
    {
      label: "Total Surat Tugas",
      value: total,
      icon: <FileText className="w-4 h-4" />,
      description: "Total keseluruhan surat tugas",
    },
    {
      label: "Bulan Ini",
      value: activeThisMonth,
      icon: <CalendarIcon className="w-4 h-4" />,
      description: "Surat tugas diterbitkan bulan ini",
    },
    {
      label: "Instansi Dominan",
      value: "ICHIBOT",
      icon: <div className="text-[10px] font-bold text-primary">ORG</div>,
      description: "Instansi paling aktif",
    },
    {
      label: "Sistem Status",
      value: "Aktif",
      icon: <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />,
      description: "Database sinkron",
    },
  ];

  return (
    <div className="space-y-6">
      <TableAnalysis cards={analysisCards} />

      <TableWrapper>
        <TableHeaderContent
          title="Surat Tugas"
          description="Kelola penugasan personel dan cetak surat tugas resmi."
          icon={<FileText className="w-5 h-5 font-bold text-primary" />}
          actions={
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari surat tugas..."
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
                Buat Surat Tugas
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
                  <TableHead>No. Surat</TableHead>
                  <TableHead>Judul / Agenda</TableHead>
                  <TableHead>Instansi</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead align="right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suratTugasList.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {st.letter_no}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <p className="font-medium text-sm truncate">
                          {st.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {st.details}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium text-muted-foreground">
                        {st.instansi}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(st.start_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell>
                      <button
                        onClick={() => {
                          setSelectedSTForPdf(st);
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
                          onClick={() => openEditModal(st)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(st.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {suratTugasList.length === 0 && (
                  <TableEmpty
                    colSpan={6}
                    message="Belum ada data surat tugas."
                  />
                )}
              </TableBody>
              {suratTugasList.length > 0 && (
                <TableFooter>
                  <TableRow hoverable={false}>
                    <TableCell colSpan={6} className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Surat Tugas:</span>
                        <span className="text-sm font-bold text-primary">{suratTugasList.length} Dokumen</span>
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
            {suratTugasList.map((st) => (
              <div
                key={st.id}
                className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="font-mono text-sm font-bold text-blue-600 uppercase">
                      {st.letter_no}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(st.start_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedSTForPdf(st);
                        setIsPdfModalOpen(true);
                      }}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(st)}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(st.id)}
                      className="p-2 bg-red-500/10 text-red-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm tracking-tight">
                    {st.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">
                    {st.details}
                  </p>
                </div>

                {st.peserta && st.peserta.length > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Peserta
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {st.peserta.map((p, idx) => (
                        <div key={idx} className="flex flex-col text-[11px]">
                          <span className="text-gray-900 font-bold">
                            {p.nama}
                          </span>
                          <span className="text-gray-500 text-[10px]">
                            {p.jabatan}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-border flex justify-between items-center">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {st.instansi}
                  </span>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(st.start_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    -{" "}
                    {new Date(st.end_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {suratTugasList.length === 0 && (
              <div className="py-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                Belum ada data surat tugas.
              </div>
            )}
          </>
        )}
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => fetchST(page, search)}
        totalCount={total}
      />

      {/* Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingST ? "Edit Surat Tugas" : "Buat Surat Tugas Baru"}
          maxWidth="4xl"
        >
          <div className="flex flex-col flex-1 h-full">
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto overscroll-contain p-8 custom-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Basic Info Section */}
                <div className="space-y-6">
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      Detail Surat
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Instansi
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["ICHI", "GAN"] as const).map((inst) => (
                            <button
                              key={inst}
                              type="button"
                              onClick={() =>
                                setFormData({ ...formData, instansi: inst })
                              }
                              className={`py-2.5 rounded-xl font-bold text-sm transition-all border ${formData.instansi === inst
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:bg-blue-50/50"
                                }`}
                            >
                              {inst === "ICHI" ? "ICHIBOT" : "PT. GAN"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Nomor Surat
                        </label>
                        <input
                          type="text"
                          value={formData.letter_no}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              letter_no: e.target.value,
                            })
                          }
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                          placeholder="Generating number..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Judul Agenda
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                        placeholder="Contoh: Training IoT Dasar"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Rincian Kegiatan
                      </label>
                      <textarea
                        required
                        value={formData.details}
                        onChange={(e) =>
                          setFormData({ ...formData, details: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none min-h-[100px] resize-none"
                        placeholder="Detail penugasan yang diberikan..."
                      />
                    </div>
                  </div>
                </div>

                {/* Participants & Dates */}
                <div className="space-y-6 flex flex-col h-full">
                  <div className="space-y-4 flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between ml-1 shrink-0">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Peserta Penugasan
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            peserta: [
                              ...formData.peserta,
                              { nama: "", jabatan: "" },
                            ],
                          })
                        }
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                      >
                        + Tambah Peserta
                      </button>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {formData.peserta.map((p, idx) => (
                        <div
                          key={idx}
                          className="group relative bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 transition-all hover:border-blue-200"
                        >
                          <input
                            type="text"
                            placeholder="Nama Lengkap"
                            value={p.nama}
                            onChange={(e) => {
                              const newPeserta = [...formData.peserta];
                              newPeserta[idx] = {
                                ...newPeserta[idx],
                                nama: e.target.value,
                              };
                              setFormData({ ...formData, peserta: newPeserta });
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500 transition-all"
                          />
                          <input
                            type="text"
                            placeholder="Jabatan"
                            value={p.jabatan}
                            onChange={(e) => {
                              const newPeserta = [...formData.peserta];
                              newPeserta[idx] = {
                                ...newPeserta[idx],
                                jabatan: e.target.value,
                              };
                              setFormData({ ...formData, peserta: newPeserta });
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                          />
                          {formData.peserta.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newPeserta = [...formData.peserta];
                                newPeserta.splice(idx, 1);
                                setFormData({
                                  ...formData,
                                  peserta: newPeserta,
                                });
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 shrink-0 pt-4 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Mulai
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            start_date: e.target.value,
                          })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                        Selesai
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:border-blue-500 transition-all"
                      />
                    </div>
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
                {editingST ? "Perbarui" : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PDF Modal */}
      {isPdfModalOpen && selectedSTForPdf && (
        <PdfSignatureModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          onDownload={handlePdfDownload}
          title="Unduh Surat Tugas"
          variant={selectedSTForPdf.instansi === "GAN" ? "gan" : "ichibot"}
        />
      )}
    </div>
  );
}
