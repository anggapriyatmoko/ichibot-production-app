"use client";

import { useState } from "react";
import {
  X,
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
        icon: <Award className="w-5 h-5" />,
      },
      {
        value: "cert_gan",
        label: "Sertifikat GAN",
        description: "Versi PT. Gagas Anagata Nusantara",
        icon: <Stamp className="w-5 h-5" />,
      },
      {
        value: "cert_gas",
        label: "Sertifikat GAS",
        description: "Versi PT. Gagas Anagata Semesta",
        icon: <Stamp className="w-5 h-5" />,
      },
      {
        value: "cert_qr_ichibot",
        label: "QR Code (ICHIBOT)",
        description: "Mode verifikasi digital logo ICHIBOT",
        icon: <QrCode className="w-5 h-5" />,
      },
      {
        value: "cert_qr_gan",
        label: "QR Code (GAN)",
        description: "Mode verifikasi digital logo GAN",
        icon: <QrCode className="w-5 h-5" />,
      },
      {
        value: "cert_qr_gas",
        label: "QR Code (GAS)",
        description: "Mode verifikasi digital logo GAS",
        icon: <QrCode className="w-5 h-5" />,
      },
    ];
  }

  if (variant === "surat_jalan") {
    return [
      {
        value: "signature_ichibot",
        label: "Logo ICHIBOT",
        description: "Surat jalan dengan logo ICHIBOT",
        icon: <Stamp className="w-5 h-5" />,
      },
      {
        value: "signature_pt_gan",
        label: "Logo GAN",
        description: "Surat jalan dengan logo PT Gagas Anagata Nusantara",
        icon: <Stamp className="w-5 h-5" />,
      },
      {
        value: "SignatureGAS",
        label: "Logo GAS",
        description: "Surat jalan dengan logo PT Gagas Anagata Semesta",
        icon: <Stamp className="w-5 h-5" />,
      },
      {
        value: "none",
        label: "Tanpa Logo (Polos)",
        description: "Surat jalan tanpa logo, tampilan bersih",
        icon: <FileCheck className="w-5 h-5" />,
      },
      {
        value: "qr",
        label: "Mode QR Code",
        description: "Dengan QR Code untuk verifikasi digital",
        icon: <QrCode className="w-5 h-5" />,
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
      icon: <Stamp className="w-5 h-5" />,
    },
    {
      value: "none",
      label: "Tanpa Cap (Polos)",
      description: "Dokumen tanpa stempel, tampilan bersih",
      icon: <FileCheck className="w-5 h-5" />,
    },
    {
      value: "qr",
      label: "Mode QR Code",
      description: "Dengan QR Code untuk verifikasi digital",
      icon: <QrCode className="w-5 h-5" />,
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
      bg: "bg-blue-50 dark:bg-blue-900/20",
      bgLight: "bg-blue-50/50 dark:bg-blue-900/10",
      bgIcon: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-600 dark:text-blue-400",
      textDark: "text-blue-700 dark:text-blue-300",
      border: "border-blue-500",
      borderLight: "border-blue-100 dark:border-blue-800",
      ring: "focus:ring-blue-500",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20",
    },
    orange: {
      bg: "bg-orange-50 dark:bg-orange-900/20",
      bgLight: "bg-orange-50/50 dark:bg-orange-900/10",
      bgIcon: "bg-orange-100 dark:bg-orange-900/40",
      text: "text-orange-600 dark:text-orange-400",
      textDark: "text-orange-700 dark:text-orange-300",
      border: "border-orange-500",
      borderLight: "border-orange-100 dark:border-orange-800",
      ring: "focus:ring-orange-500",
      button: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      bgLight: "bg-purple-50/50 dark:bg-purple-900/10",
      bgIcon: "bg-purple-100 dark:bg-purple-900/40",
      text: "text-purple-600 dark:text-purple-400",
      textDark: "text-purple-700 dark:text-purple-300",
      border: "border-purple-500",
      borderLight: "border-purple-100 dark:border-purple-800",
      ring: "focus:ring-purple-500",
      button: "bg-purple-500 hover:bg-purple-600 shadow-purple-500/20",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      bgLight: "bg-emerald-50/50 dark:bg-emerald-900/10",
      bgIcon: "bg-emerald-100 dark:bg-emerald-900/40",
      text: "text-emerald-600 dark:text-emerald-400",
      textDark: "text-emerald-700 dark:text-emerald-300",
      border: "border-emerald-500",
      borderLight: "border-emerald-100 dark:border-emerald-800",
      ring: "focus:ring-emerald-500",
      button: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
    },
  }[colorClass];

  // Logic for preview URL
  const previewProxyUrl = buildPreviewUrl 
    ? `/api/download-pdf?url=${encodeURIComponent(buildPreviewUrl(selectedSignature))}&inline=true`
    : pdfUrl
      ? `/api/download-pdf?url=${encodeURIComponent(`${pdfUrl}?signature=${selectedSignature}`)}&inline=true`
      : null;
      
  const hasPreview = !!pdfUrl || !!buildPreviewUrl;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${themeColors.bg}`}>
            <FileText className={`w-5 h-5 ${themeColors.text}`} />
          </div>
          <div>
            <span className="text-foreground">{title}</span>
          </div>
        </div>
      }
      maxWidth={hasPreview ? "full" : "md"}
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-foreground font-semibold rounded-xl border border-border hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleDownload}
            className={`px-5 py-2.5 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg ${themeColors.button}`}
          >
            <Download className="w-4 h-4" />
            Unduh
          </button>
        </div>
      }
    >
      <div className={cn(
        "flex flex-col gap-6",
        hasPreview ? "h-[85vh] lg:flex-row lg:items-stretch lg:gap-8" : "min-h-[400px]"
      )}>
        {/* Left Side: Options */}
        <div className={cn(
          "space-y-6 flex flex-col shrink-0",
          hasPreview && "lg:w-[320px] lg:border-r lg:border-border lg:pr-6"
        )}>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-sm text-muted-foreground mb-6">
              Pilih jenis format untuk file PDF yang akan diunduh.
            </p>

            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Pilihan Format
            </p>

            <div className="space-y-3">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    selectedSignature === option.value
                      ? `${themeColors.border} ${themeColors.bgLight}`
                      : "border-border hover:border-muted-foreground/20 hover:bg-muted/50"
                  )}
                >
                  <input
                    type="radio"
                    name="signature"
                    value={option.value}
                    checked={selectedSignature === option.value}
                    onChange={() => setSelectedSignature(option.value)}
                    className={cn("w-4 h-4", themeColors.ring, "border-input", themeColors.text)}
                  />
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    selectedSignature === option.value
                      ? `${themeColors.bgIcon} ${themeColors.text}`
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                  )}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <span className={cn(
                      "text-sm font-semibold transition-colors",
                      selectedSignature === option.value
                        ? themeColors.textDark
                        : "text-foreground group-hover:text-foreground/90"
                    )}>
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Info Box for QR */}
            {isQrMode && (
              <div className={cn(
                "p-4 rounded-xl border animate-in fade-in duration-200 mt-6",
                themeColors.bg,
                themeColors.borderLight
              )}>
                <div className="flex gap-3">
                  <QrCode className={cn("w-5 h-5 shrink-0", themeColors.text)} />
                  <p className={cn("text-xs font-medium leading-relaxed", themeColors.textDark)}>
                    Mode QR Code memungkinkan verifikasi keaslian dokumen secara
                    digital dengan memindai QR yang tercetak.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: PDF Preview */}
        {hasPreview && (
          <div className="flex-1 relative bg-[#525659] rounded-2xl overflow-hidden border border-border shadow-2xl flex flex-col mt-6 lg:mt-0 lg:min-h-0 min-h-[400px]">
            <div className="h-12 bg-muted/95 backdrop-blur-md border-b border-border flex items-center px-6 shrink-0 z-10 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/60 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-green-400/60 shadow-sm" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-background/50 rounded-md border border-border/50">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-bold text-muted-foreground tracking-wide uppercase">
                  Preview {variant.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="w-16" />
            </div>
            {previewProxyUrl ? (
              <iframe
                src={previewProxyUrl}
                className="w-full flex-1"
                style={{ border: "none" }}
                title="PDF Preview"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3 bg-muted/50">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-xs font-semibold">Memuat Pratinjau...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
