import React from "react";
import { X, Calendar as CalendarIcon } from "lucide-react";
import { IchibotEvent } from "@/app/actions/calendar";

interface EventViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Partial<IchibotEvent> | null;
}

// Helper to format date in Indonesian
const formatDateIndo = (dateStr: string | undefined): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Color mapping for event types
const typeColors: Record<string, { bg: string; text: string; border: string }> =
  {
    kegiatan: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-500",
    },
    "cuti bersama": {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-500",
    },
    "libur nasional": {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-500",
    },
  };

const typeLabels: Record<string, string> = {
  kegiatan: "KEGIATAN",
  "cuti bersama": "CUTI BERSAMA",
  "libur nasional": "LIBUR NASIONAL",
};

export const EventViewModal: React.FC<EventViewModalProps> = ({
  isOpen,
  onClose,
  event,
}) => {
  if (!isOpen || !event) return null;

  const jenis = event.jenis || "kegiatan";
  const colors = typeColors[jenis] || typeColors.kegiatan;
  const label = typeLabels[jenis] || "KEGIATAN";

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`bg-white border-t-4 ${colors.border} rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}
      >
        {/* Header with Icon */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start">
          <div className={`${colors.bg} p-3 rounded-xl`}>
            <CalendarIcon className={`w-8 h-8 ${colors.text}`} />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Type Badge */}
          <span
            className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${colors.bg} ${colors.text}`}
          >
            {label}
          </span>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900">
            {event.kegiatan || "Tidak ada judul"}
          </h2>

          {/* Date */}
          <div className="flex items-center gap-3 text-gray-600">
            <div className="bg-gray-100 p-2 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Tanggal
              </p>
              <p className="font-semibold text-gray-800">
                {formatDateIndo(event.tanggal)}
              </p>
            </div>
          </div>

          {/* Time (if available) */}
          {(event.waktu_mulai || event.waktu_selesai) && (
            <div className="flex items-center gap-3 text-gray-600">
              <div className="bg-gray-100 p-2 rounded-lg">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeWidth="2" d="M12 6v6l4 2" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Waktu
                </p>
                <p className="font-semibold text-gray-800">
                  {event.waktu_mulai || "00:00"}
                  {event.waktu_selesai ? ` - ${event.waktu_selesai}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Detail */}
          {event.detail && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Keterangan Detail
              </p>
              <p className="text-gray-700">{event.detail}</p>
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className={`w-full py-3 font-bold text-white rounded-xl transition-all shadow-lg active:scale-[0.98] ${
              jenis === "libur nasional"
                ? "bg-red-500 shadow-red-500/30 hover:bg-red-600"
                : jenis === "cuti bersama"
                  ? "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600"
                  : "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600"
            }`}
          >
            Mengerti, Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
