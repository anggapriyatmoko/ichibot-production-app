"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Stamp,
  FileCheck,
  QrCode,
  Award,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import Modal from "./modal";

export type SignatureType =
  | "signature_ichibot"
  | "signature_pt_gan"
  | "SignatureGAS"
  | "none"
  | "qr"
  | "cert_ichibot"
  | "cert_gan"
  | "cert_gas"
  | "cert_qr_ichibot"
  | "cert_qr_gan"
  | "cert_qr_gas";

export type ModalVariant = "ichibot" | "gan" | "gas" | "certificate" | "surat_jalan";

interface SignatureOption {
  value: SignatureType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const getSignatureOptions = (variant: ModalVariant): SignatureOption[] => {
  if (variant === "certificate") {
    return [
      {
        value: "cert_ichibot",
        label: "Sertifikat ICHIBOT",
        description: "Versi standar dengan logo ICHIBOT",
        icon: <Award className="w-4 h-4" />,
      },
      {
        value: "cert_gan",
        label: "Sertifikat GAN",
        description: "Versi PT. Gagas Anagata Nusantara",
        icon: <Stamp className="w-4 h-4" />,
      },
      {
        value: "cert_gas",
        label: "Sertifikat GAS",
        description: "Versi PT. Gagas Anagata Semesta",
        icon: <Stamp className="w-4 h-4" />,
      },
      {
        value: "cert_qr_ichibot",
        label: "QR Code (ICHIBOT)",
        description: "Mode verifikasi digital logo ICHIBOT",
        icon: <QrCode className="w-4 h-4" />,
      },
      {
        value: "cert_qr_gan",
        label: "QR Code (GAN)",
        description: "Mode verifikasi digital logo GAN",
        icon: <QrCode className="w-4 h-4" />,
      },
      {
        value: "cert_qr_gas",
        label: "QR Code (GAS)",
        description: "Mode verifikasi digital logo GAS",
        icon: <QrCode className="w-4 h-4" />,
      },
    ];
  }

  if (variant === "surat_jalan") {
    return [
      {
        value: "signature_ichibot",
        label: "Logo ICHIBOT",
        description: "Surat jalan dengan logo ICHIBOT",
        icon: <Stamp className="w-4 h-4" />,
      },
      {
        value: "signature_pt_gan",
        label: "Logo GAN",
        description: "Surat jalan dengan logo PT Gagas Anagata Nusantara",
        icon: <Stamp className="w-4 h-4" />,
      },
      {
        value: "SignatureGAS",
        label: "Logo GAS",
        description: "Surat jalan dengan logo PT Gagas Anagata Semesta",
        icon: <Stamp className="w-4 h-4" />,
      },
      {
        value: "none",
        label: "Tanpa Logo (Polos)",
        description: "Surat jalan tanpa logo, tampilan bersih",
        icon: <FileCheck className="w-4 h-4" />,
      },
      {
        value: "qr",
        label: "Mode QR Code",
        description: "Dengan QR Code untuk verifikasi digital",
        icon: <QrCode className="w-4 h-4" />,
      },
    ];
  }

  return [
    {
      value: variant === "gan" ? "signature_pt_gan" : variant === "gas" ? "SignatureGAS" : "signature_ichibot",
      label: variant === "gan" ? "Dengan Cap GAN" : variant === "gas" ? "Dengan Cap GAS" : "Dengan Cap",
      description:
        variant === "gan"
          ? "Invoice dengan stempel PT Gagas Anagata Nusantara"
          : variant === "gas"
            ? "Invoice dengan stempel PT Gagas Anagata Semesta"
            : "Invoice dengan stempel dan tanda tangan",
      icon: <Stamp className="w-4 h-4" />,
    },
    {
      value: "none",
      label: "Tanpa Cap (Polos)",
      description: "Dokumen tanpa stempel, tampilan bersih",
      icon: <FileCheck className="w-4 h-4" />,
    },
    {
      value: "qr",
      label: "Mode QR Code",
      description: "Dengan QR Code untuk verifikasi digital",
      icon: <QrCode className="w-4 h-4" />,
    },
  ];
};

interface PdfSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (signatureType: SignatureType) => void;
  title?: string;
  variant?: ModalVariant;
  pdfUrl?: string; // Optional base URL for preview
  buildPreviewUrl?: (signature: SignatureType) => string;
}

export default function PdfSignatureModal({
  isOpen,
  onClose,
  onDownload,
  title = "Unduh PDF",
  variant = "ichibot",
  pdfUrl,
  buildPreviewUrl,
}: PdfSignatureModalProps) {
  const options = getSignatureOptions(variant);
  const getDefaultValue = () => {
    if (variant === "certificate") return "cert_gan";
    if (variant === "gan") return "signature_pt_gan";
    if (variant === "gas") return "SignatureGAS";
    if (variant === "surat_jalan") return "signature_pt_gan";
    return "signature_ichibot";
  };

  const [selectedSignature, setSelectedSignature] =
    useState<SignatureType>(getDefaultValue());

  const handleDownload = () => {
    onDownload(selectedSignature);
    onClose();
  };

  const isQrMode = selectedSignature.includes("qr");
  const colorClass =
    variant === "gan"
      ? "orange"
      : variant === "gas"
        ? "purple"
        : variant === "certificate"
          ? "emerald"
          : variant === "surat_jalan"
            ? "blue"
            : "blue";

  const themeColors = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      bgLight: "bg-blue-50/50 dark:bg-blue-900/10",
      bgIcon: "bg-blue-100 dark:bg-blue-900/50",
      bgIconActive: "bg-blue-500 dark:bg-blue-600",
      text: "text-blue-600 dark:text-blue-400",
      textDark: "text-blue-700 dark:text-blue-300",
      border: "border-blue-200 dark:border-blue-800",
      borderActive: "border-blue-400 dark:border-blue-600",
      borderLight: "border-blue-100 dark:border-blue-800",
      ring: "focus:ring-blue-500",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25",
      dot: "bg-blue-600",
      gradient: "from-blue-500 to-blue-600",
      shadowActive: "shadow-blue-500/15 dark:shadow-blue-500/10",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-950/40",
      bgLight: "bg-orange-50/50 dark:bg-orange-900/10",
      bgIcon: "bg-orange-100 dark:bg-orange-900/50",
      bgIconActive: "bg-orange-500 dark:bg-orange-600",
      text: "text-orange-600 dark:text-orange-400",
      textDark: "text-orange-700 dark:text-orange-300",
      border: "border-orange-200 dark:border-orange-800",
      borderActive: "border-orange-400 dark:border-orange-600",
      borderLight: "border-orange-100 dark:border-orange-800",
      ring: "focus:ring-orange-500",
      button: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/25",
      dot: "bg-orange-500",
      gradient: "from-orange-500 to-orange-600",
      shadowActive: "shadow-orange-500/15 dark:shadow-orange-500/10",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950/40",
      bgLight: "bg-purple-50/50 dark:bg-purple-900/10",
      bgIcon: "bg-purple-100 dark:bg-purple-900/50",
      bgIconActive: "bg-purple-500 dark:bg-purple-600",
      text: "text-purple-600 dark:text-purple-400",
      textDark: "text-purple-700 dark:text-purple-300",
      border: "border-purple-200 dark:border-purple-800",
      borderActive: "border-purple-400 dark:border-purple-600",
      borderLight: "border-purple-100 dark:border-purple-800",
      ring: "focus:ring-purple-500",
      button: "bg-purple-500 hover:bg-purple-600 shadow-purple-500/25",
      dot: "bg-purple-500",
      gradient: "from-purple-500 to-purple-600",
      shadowActive: "shadow-purple-500/15 dark:shadow-purple-500/10",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      bgLight: "bg-emerald-50/50 dark:bg-emerald-900/10",
      bgIcon: "bg-emerald-100 dark:bg-emerald-900/50",
      bgIconActive: "bg-emerald-500 dark:bg-emerald-600",
      text: "text-emerald-600 dark:text-emerald-400",
      textDark: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-200 dark:border-emerald-800",
      borderActive: "border-emerald-400 dark:border-emerald-600",
      borderLight: "border-emerald-100 dark:border-emerald-800",
      ring: "focus:ring-emerald-500",
      button: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25",
      dot: "bg-emerald-500",
      gradient: "from-emerald-500 to-emerald-600",
      shadowActive: "shadow-emerald-500/15 dark:shadow-emerald-500/10",
    },
  }[colorClass];

  // Logic for preview URL
  const previewProxyUrlRaw = buildPreviewUrl 
    ? `/api/download-pdf?url=${encodeURIComponent(buildPreviewUrl(selectedSignature))}&inline=true`
    : pdfUrl
      ? `/api/download-pdf?url=${encodeURIComponent(`${pdfUrl}?signature=${selectedSignature}`)}&inline=true`
      : null;
      
  const previewProxyUrl = previewProxyUrlRaw ? `${previewProxyUrlRaw}#toolbar=0&navpanes=0&scrollbar=0` : null;

  const hasPreview = !!pdfUrl || !!buildPreviewUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl bg-gradient-to-br shadow-sm", themeColors.gradient)}>
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-foreground font-bold">{title}</span>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Pilih format dan pratinjau sebelum mengunduh
            </p>
          </div>
        </div>
      }
      maxWidth={hasPreview ? "5xl" : "md"}
      className={hasPreview ? "p-0 sm:p-0" : ""}
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="hidden sm:flex items-center gap-2.5">
            <div className={cn("w-2 h-2 rounded-full", themeColors.dot)} />
            <span className="text-sm font-medium text-muted-foreground">
              Format Terpilih: <strong className="text-foreground">{options.find(o => o.value === selectedSignature)?.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm text-foreground font-medium rounded-xl border border-border bg-background hover:bg-muted transition-all"
            >
              Batal
            </button>
            <button
              onClick={handleDownload}
              className={cn(
                "px-6 py-2.5 text-sm text-white font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98] bg-gradient-to-r",
                themeColors.gradient
              )}
            >
              <Download className="w-4 h-4" />
              Unduh PDF
            </button>
          </div>
        </div>
      }
    >
      <div className={cn(
        "flex flex-col",
        hasPreview ? "h-[85vh] lg:h-[75vh] lg:flex-row" : "min-h-[400px] p-6"
      )}>
        {/* Left Side: Options */}
        <div className={cn(
          "flex flex-col shrink-0 bg-muted/10",
          hasPreview && "max-h-[35vh] lg:max-h-none lg:w-[340px] overflow-y-auto custom-scrollbar p-6 border-b lg:border-b-0 lg:border-r border-border"
        )}>
          <div className="flex items-center gap-2 mb-5">
            <div className={cn("h-4 w-1 rounded-full", themeColors.bgIconActive)} />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Pilihan Format
            </p>
          </div>

          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = selectedSignature === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "group relative flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border",
                    isSelected
                      ? cn("bg-background shadow-md", themeColors.borderActive, themeColors.shadowActive)
                      : "bg-background/50 border-border hover:bg-muted/80 hover:border-border/80 shadow-sm"
                  )}
                >
                  <input
                    type="radio"
                    name="signature"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setSelectedSignature(option.value)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "p-2.5 rounded-lg transition-all duration-300 shrink-0 mt-0.5",
                    isSelected
                      ? cn(themeColors.bgIconActive, "text-white shadow-sm scale-110")
                      : cn("bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-muted/80")
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "text-sm font-bold block truncate transition-colors mb-1",
                      isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                  <div className={cn(
                    "absolute top-4 right-4 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected ? cn(themeColors.borderActive) : "border-muted-foreground/30"
                  )}>
                    {isSelected && <div className={cn("w-2 h-2 rounded-full", themeColors.dot)} />}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Info Box for QR */}
          {isQrMode && (
            <div className={cn(
              "mt-5 p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-300",
              "bg-background shadow-sm",
              themeColors.borderLight
            )}>
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", themeColors.bgIconActive)}>
                  <QrCode className="w-4 h-4 text-white" />
                </div>
                <div className="space-y-1">
                  <p className={cn("text-xs font-bold", themeColors.textDark)}>Verifikasi Digital</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Dokumen ini dilengkapi QR Code untuk memverifikasi keaslian via pemindaian digital.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: PDF Preview */}
        {hasPreview && (
          <div className="flex-1 min-w-0 flex flex-col bg-background relative">
            {/* Preview toolbar */}
            <div className="h-14 bg-background border-b border-border flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground">
                    Pratinjau Dokumen
                  </span>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                "bg-background", themeColors.text, themeColors.border
              )}>
                {options.find(o => o.value === selectedSignature)?.label ?? ""}
              </div>
            </div>

            {/* PDF iframe or loading state */}
            <div className="flex-1 relative bg-muted/20">
              {previewProxyUrl ? (
                <iframe
                  key={previewProxyUrl}
                  src={previewProxyUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/50 backdrop-blur-sm">
                  <Loader2 className={cn("w-8 h-8 animate-spin", themeColors.text)} />
                  <span className="text-sm font-medium text-muted-foreground animate-pulse">
                    Menyiapkan pratinjau...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
