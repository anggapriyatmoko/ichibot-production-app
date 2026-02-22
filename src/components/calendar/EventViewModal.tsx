import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { IchibotEvent } from "@/app/actions/calendar";
import Modal from "@/components/ui/modal";

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
  if (!event) return null;

  const jenis = event.jenis || "kegiatan";
  const colors = typeColors[jenis] || typeColors.kegiatan;
  const label = typeLabels[jenis] || "KEGIATAN";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={(
        <div className="flex items-center gap-3">
          <div className={`${colors.bg} p-2 rounded-lg`}>
            <CalendarIcon className={`w-5 h-5 ${colors.text}`} />
          </div>
          <span>Detail Agenda</span>
        </div>
      )}
      maxWidth="md"
      footer={(
        <button
          onClick={onClose}
          className={`w-full py-3 font-bold text-white rounded-xl transition-all shadow-lg active:scale-[0.98] ${jenis === "libur nasional"
            ? "bg-red-500 shadow-red-500/30 hover:bg-red-600"
            : jenis === "cuti bersama"
              ? "bg-amber-500 shadow-amber-500/30 hover:bg-amber-600"
              : "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-600"
            }`}
        >
          Mengerti, Tutup
        </button>
      )}
    >
      <div className="space-y-4">
        {/* Type Badge */}
        <span
          className={`inline-block px-3 py-1 text-xs font-bold rounded-full ${colors.bg} ${colors.text}`}
        >
          {label}
        </span>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground">
          {event.kegiatan || "Tidak ada judul"}
        </h2>

        {/* Date */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="bg-muted p-2 rounded-lg">
            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tanggal
            </p>
            <p className="font-semibold text-foreground">
              {formatDateIndo(event.tanggal)}
            </p>
          </div>
        </div>

        {/* Time (if available) */}
        {(event.waktu_mulai || event.waktu_selesai) && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="bg-muted p-2 rounded-lg">
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeWidth="2" d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Waktu
              </p>
              <p className="font-semibold text-foreground">
                {event.waktu_mulai || "00:00"}
                {event.waktu_selesai ? ` - ${event.waktu_selesai}` : ""}
              </p>
            </div>
          </div>
        )}

        {/* Detail */}
        {event.detail && (
          <div className="bg-muted/50 border border-border rounded-xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Keterangan Detail
            </p>
            <p className="text-foreground">{event.detail}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
