import React from "react";
import {
  FileText,
  Tag,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import { IchibotEvent } from "@/app/actions/calendar";
import Modal from "@/components/ui/modal";

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
  formData: Partial<IchibotEvent>;
  setFormData: (data: Partial<IchibotEvent>) => void;
  isEdit: boolean;
  isSubmitting: boolean;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  formData,
  setFormData,
  isEdit,
  isSubmitting,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Agenda" : "Tambah Agenda Baru"}
      maxWidth="lg"
      footer={(
        <div className="flex items-center justify-between w-full">
          {isEdit ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Hapus
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              form="calendar-event-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-primary/20 active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEdit ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Agenda"
              )}
            </button>
          </div>
        </div>
      )}
    >
      <form id="calendar-event-form" onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-4">
          {/* Judul Kegiatan */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary" />
              Nama Kegiatan
            </label>
            <input
              required
              type="text"
              value={formData.kegiatan}
              onChange={(e) =>
                setFormData({ ...formData, kegiatan: e.target.value })
              }
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Contoh: Meeting Internal Ichibot"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Jenis */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Tag className="w-3 h-3 text-primary" />
                Jenis Agenda
              </label>
              <select
                value={formData.jenis}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    jenis: e.target.value as IchibotEvent["jenis"],
                  })
                }
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              >
                <option value="kegiatan">Kegiatan</option>
                <option value="cuti bersama">Cuti Bersama</option>
                <option value="libur nasional">Libur Nasional</option>
              </select>
            </div>

            {/* Tanggal */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon className="w-3 h-3 text-primary" />
                Tanggal
              </label>
              <input
                required
                type="date"
                value={formData.tanggal}
                onChange={(e) =>
                  setFormData({ ...formData, tanggal: e.target.value })
                }
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Waktu Mulai */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3 text-primary" />
                Mulai (Opsional)
              </label>
              <input
                type="time"
                value={formData.waktu_mulai || ""}
                onChange={(e) =>
                  setFormData({ ...formData, waktu_mulai: e.target.value })
                }
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>

            {/* Waktu Selesai */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3 h-3 text-primary" />
                Selesai (Opsional)
              </label>
              <input
                type="time"
                value={formData.waktu_selesai || ""}
                onChange={(e) =>
                  setFormData({ ...formData, waktu_selesai: e.target.value })
                }
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Detail */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-3 h-3 text-primary" />
              Keterangan Detail
            </label>
            <textarea
              rows={3}
              value={formData.detail || ""}
              onChange={(e) =>
                setFormData({ ...formData, detail: e.target.value })
              }
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
              placeholder="Tuliskan detail agenda di sini..."
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
