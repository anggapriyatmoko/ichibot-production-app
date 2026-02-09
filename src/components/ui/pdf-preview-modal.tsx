"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, ExternalLink, FileText, Printer } from "lucide-react";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resiId: number | string | null;
  title?: string;
}

export default function PdfPreviewModal({
  isOpen,
  onClose,
  resiId,
  title = "Preview PDF",
}: PdfPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset loading state when modal opens or resiId changes
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
    }
  }, [isOpen, resiId]);

  if (!isOpen || !resiId || !mounted) return null;

  // Use local proxy API that handles API key authentication
  const proxyUrl = `/api/resi-pdf?id=${resiId}`;
  const downloadFilename = `Resi-${resiId}.pdf`;

  const handleDownload = async () => {
    try {
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      // Fallback: open in new tab
      window.open(proxyUrl, "_blank");
    }
  };

  const handlePrint = () => {
    const printWindow = window.open(proxyUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleOpenInNewTab = () => {
    window.open(proxyUrl, "_blank");
  };

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-999 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container - Centered */}
      <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 md:p-8">
        <div
          className="bg-white dark:bg-card rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-200 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-border shrink-0 bg-white dark:bg-card z-20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                  {title}
                </h2>
                <p className="text-xs text-gray-500 dark:text-muted-foreground">
                  Preview dokumen resi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={handlePrint}
                className="p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-xl transition-colors text-gray-600 dark:text-muted-foreground"
                title="Cetak Resi"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button
                onClick={handleOpenInNewTab}
                className="p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-xl transition-colors text-gray-500 dark:text-muted-foreground"
                title="Buka di tab baru"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors text-blue-600"
                title="Unduh PDF"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-muted rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* PDF Preview Area */}
          <div className="flex-1 relative bg-gray-100 dark:bg-muted/30 overflow-hidden flex flex-col items-center justify-center">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-gray-50/90 dark:bg-card/90 backdrop-blur-md transition-all duration-300">
                <div className="relative w-24 h-24 mb-6">
                  {/* Decorative Shimmer Circle */}
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-4 bg-blue-500/5 rounded-full flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"></div>
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </div>

                <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-foreground">
                    Sedang Menyiapkan PDF
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-muted-foreground">
                    Ini perlu beberapa saat, mohon tunggu...
                  </p>

                  {/* Progress Indicator Shimmer */}
                  <div className="w-48 h-1.5 bg-gray-200 dark:bg-muted rounded-full mx-auto mt-4 overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary animate-shimmer-fast"></div>
                  </div>
                </div>
              </div>
            )}

            <iframe
              src={`${proxyUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className={`w-full h-full border-0 transition-opacity duration-700 ${loading ? "opacity-0" : "opacity-100"}`}
              onLoad={() => {
                // Ensure the loading is visible long enough to be seen
                setTimeout(() => setLoading(false), 1200);
              }}
              title="PDF Preview"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-border bg-gray-50 dark:bg-muted/30 rounded-b-2xl shrink-0 z-20">
            <p className="text-xs text-gray-500 dark:text-muted-foreground truncate font-mono">
              Resi #{resiId}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-5 py-2 text-gray-700 dark:text-foreground font-semibold rounded-xl border border-gray-200 dark:border-border hover:bg-gray-100 dark:hover:bg-muted transition-colors"
              >
                Tutup
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-100 dark:bg-muted hover:bg-gray-200 dark:hover:bg-muted/80 text-gray-700 dark:text-foreground font-semibold rounded-xl flex items-center gap-2 transition-colors border border-gray-200 dark:border-border"
                >
                  <Printer className="w-4 h-4" />
                  Cetak
                </button>
                <button
                  onClick={handleDownload}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Unduh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
