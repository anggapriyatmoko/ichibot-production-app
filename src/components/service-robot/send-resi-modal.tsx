"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Send,
  Truck,
  User,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import { createResi, getDefaultSender } from "@/app/actions/resi";
import { ResiData } from "@/lib/resi-constants";
import { useAlert } from "@/hooks/use-alert";

interface ServiceRobot {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  robotType: string;
  serviceNotes: string | null;
}

interface SendResiModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceRobot | null;
  onSuccess?: () => void;
}

export default function SendResiModal({
  isOpen,
  onClose,
  service,
  onSuccess,
}: SendResiModalProps) {
  const { showAlert, showError } = useAlert();
  const [loading, setLoading] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  // Form state
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Load defaults when modal opens
  useEffect(() => {
    if (isOpen && service) {
      loadDefaults();
    }
  }, [isOpen, service]);

  const loadDefaults = async () => {
    setLoadingDefaults(true);
    try {
      const defaults = await getDefaultSender();
      setSenderName(defaults.name);
      setSenderPhone(defaults.phone);
      setSenderAddress(defaults.address);

      // Pre-fill receiver from service data
      if (service) {
        setReceiverName(service.customerName);
        setReceiverPhone(service.customerPhone);
        setReceiverAddress(service.customerAddress);
        setNotes(
          `Robot: ${service.robotType}${service.serviceNotes ? ` - ${service.serviceNotes}` : ""}`,
        );
      }
    } catch (error) {
      console.error("Failed to load defaults:", error);
    } finally {
      setLoadingDefaults(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiverName || !receiverPhone || !receiverAddress) {
      showError("Data penerima harus lengkap");
      return;
    }

    if (!senderName || !senderPhone || !senderAddress) {
      showError("Data pengirim harus lengkap");
      return;
    }

    setLoading(true);
    try {
      const data: ResiData = {
        sender_name: senderName,
        sender_phone: senderPhone,
        sender_address: senderAddress,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: receiverAddress,
        notes: notes || undefined,

        status: "pending",
      };

      const result = await createResi(data);

      if (result.success) {
        showAlert(result.message || "Resi berhasil dibuat!");
        onSuccess?.();
        onClose();
      } else {
        showError(result.message || "Gagal membuat resi");
      }
    } catch (error) {
      showError("Terjadi kesalahan saat membuat resi");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <span>Kirim Resi</span>
        </div>
      }
      maxWidth="lg"
      className="p-0"
    >
      {loadingDefaults ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-4 space-y-4 flex-1">
            {/* Sender Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500" />
                Data Pengirim
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Nama Pengirim
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    No HP Pengirim
                  </label>
                  <input
                    type="text"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Alamat Pengirim
                </label>
                <textarea
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                  required
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Receiver Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-500" />
                Data Penerima
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    No HP Penerima
                  </label>
                  <input
                    type="text"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Alamat Penerima
                </label>
                <textarea
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                  required
                />
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Additional Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" />
                Info Tambahan
              </h4>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Catatan
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan pengiriman..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none"
                />
              </div>
            </div>

            {/* Actions */}
          </div>
          <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Kirim Resi
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
