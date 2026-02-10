"use client";

import { useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  ShieldAlert,
} from "lucide-react";

export default function SyncProductionsButton() {
  const [syncing, setSyncing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    data?: { total: number; success: number; failed: number; errors: string[] };
  } | null>(null);

  const handleSync = async () => {
    setShowConfirm(false);
    setSyncing(true);
    setResult(null);

    try {
      const response = await fetch("/api/sync-productions", {
        method: "POST",
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <div className="p-6 border border-border rounded-xl bg-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <RefreshCw className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              Sync Sparepart ke Administration
            </h3>
            <p className="text-sm text-muted-foreground">
              Kirim ulang semua data sparepart dari database ini ke
              administration.ichibot.id
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowConfirm(true)}
          disabled={syncing}
          className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sync Sekarang
            </>
          )}
        </button>

        {result && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              result.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold mb-1">
              {result.success ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {result.message}
            </div>
            {result.data && (
              <div className="mt-2 text-xs space-y-1">
                <p>
                  Total: {result.data.total} | Berhasil: {result.data.success} |
                  Gagal: {result.data.failed}
                </p>
                {result.data.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">
                      Lihat {result.data.errors.length} error
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                      {result.data.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Konfirmasi Sync</h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none mt-1">
                    Sinkronisasi Data Sparepart
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-2 hover:bg-accent rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Apakah Anda yakin ingin mengirim ulang{" "}
                <span className="font-bold text-foreground">
                  semua data sparepart
                </span>{" "}
                dari database ini ke{" "}
                <span className="font-bold text-blue-500">
                  administration.ichibot.id
                </span>
                ?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Perhatian:
                </p>
                <ul className="pl-5 list-disc space-y-0.5">
                  <li>Proses ini mungkin membutuhkan waktu beberapa menit</li>
                  <li>
                    Data yang sudah ada di administration akan diperbarui (bukan
                    terduplikasi)
                  </li>
                  <li>Jangan tutup halaman ini selama proses berlangsung</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex justify-end gap-3 bg-muted/10">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 text-sm font-bold hover:bg-accent rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSync}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Ya, Sync Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
