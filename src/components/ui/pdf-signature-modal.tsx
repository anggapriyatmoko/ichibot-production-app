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
} from "lucide-react";

export type SignatureType =
  | "signature_ichibot"
  | "signature_pt_gan"
  | "none"
  | "qr"
  | "cert_ichibot"
  | "cert_gan"
  | "cert_qr_ichibot"
  | "cert_qr_gan";

export type ModalVariant = "ichibot" | "gan" | "certificate";

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
    ];
  }

  return [
    {
      value: variant === "gan" ? "signature_pt_gan" : "signature_ichibot",
      label: variant === "gan" ? "Dengan Cap GAN" : "Dengan Cap",
      description:
        variant === "gan"
          ? "Invoice dengan stempel PT Gagas Anagata Nusantara"
          : "Invoice dengan stempel dan tanda tangan",
      icon: <Stamp className="w-5 h-5" />,
    },
    {
      value: "none",
      label: "Tanpa Cap (Polos)",
      description: "Invoice tanpa stempel, tampilan bersih",
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
}

export default function PdfSignatureModal({
  isOpen,
  onClose,
  onDownload,
  title = "Unduh PDF",
  variant = "ichibot",
}: PdfSignatureModalProps) {
  const options = getSignatureOptions(variant);
  const getDefaultValue = () => {
    if (variant === "certificate") return "cert_gan";
    return variant === "gan" ? "signature_pt_gan" : "signature_ichibot";
  };

  const [selectedSignature, setSelectedSignature] =
    useState<SignatureType>(getDefaultValue());

  if (!isOpen) return null;

  const handleDownload = () => {
    onDownload(selectedSignature);
    onClose();
  };

  const isQrMode = selectedSignature.includes("qr");
  const colorClass =
    variant === "gan"
      ? "orange"
      : variant === "certificate"
        ? "emerald"
        : "blue";

  const themeColors = {
    blue: {
      bg: "bg-blue-50",
      bgLight: "bg-blue-50/50",
      bgIcon: "bg-blue-100",
      text: "text-blue-600",
      textDark: "text-blue-700",
      border: "border-blue-500",
      borderLight: "border-blue-100",
      ring: "focus:ring-blue-500",
      button: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20",
    },
    orange: {
      bg: "bg-orange-50",
      bgLight: "bg-orange-50/50",
      bgIcon: "bg-orange-100",
      text: "text-orange-600",
      textDark: "text-orange-700",
      border: "border-orange-500",
      borderLight: "border-orange-100",
      ring: "focus:ring-orange-500",
      button: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20",
    },
    emerald: {
      bg: "bg-emerald-50",
      bgLight: "bg-emerald-50/50",
      bgIcon: "bg-emerald-100",
      text: "text-emerald-600",
      textDark: "text-emerald-700",
      border: "border-emerald-500",
      borderLight: "border-emerald-100",
      ring: "focus:ring-emerald-500",
      button: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
    },
  }[colorClass];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${themeColors.bg}`}>
                <FileText className={`w-5 h-5 ${themeColors.text}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-xs text-gray-500">
                  Pilih jenis format untuk PDF
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Pilihan Format
            </p>

            <div className="space-y-3">
              {options.map((option) => (
                <label
                  key={option.value}
                  className={`
                    group flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${
                      selectedSignature === option.value
                        ? `${themeColors.border} ${themeColors.bgLight}`
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="signature"
                    value={option.value}
                    checked={selectedSignature === option.value}
                    onChange={() => setSelectedSignature(option.value)}
                    className={`w-4 h-4 ${themeColors.ring} border-gray-300 ${themeColors.text}`}
                  />
                  <div
                    className={`
                    p-2 rounded-lg transition-colors
                    ${
                      selectedSignature === option.value
                        ? `${themeColors.bgIcon} ${themeColors.text}`
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    }
                  `}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <span
                      className={`
                      text-sm font-semibold transition-colors
                      ${
                        selectedSignature === option.value
                          ? themeColors.textDark
                          : "text-gray-700 group-hover:text-gray-900"
                      }
                    `}
                    >
                      {option.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Info Box for QR */}
            {isQrMode && (
              <div
                className={`p-4 rounded-xl border animate-in fade-in duration-200 ${themeColors.bg} ${themeColors.borderLight}`}
              >
                <div className="flex gap-3">
                  <QrCode className={`w-5 h-5 shrink-0 ${themeColors.text}`} />
                  <p
                    className={`text-xs font-medium leading-relaxed ${themeColors.textDark}`}
                  >
                    Mode QR Code memungkinkan verifikasi keaslian dokumen secara
                    digital dengan memindai QR yang tercetak.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleDownload}
              className={`px-5 py-2.5 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg ${themeColors.button}`}
            >
              <Download className="w-4 h-4" />
              Unduh PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
