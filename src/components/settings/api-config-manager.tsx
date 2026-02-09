"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Globe,
  Key,
  Loader2,
  Save,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  Truck,
  Send,
  AlertCircle,
} from "lucide-react";
import {
  getAllApiSettings,
  saveApiSettings,
  testApiConnection,
} from "@/app/actions/system-settings";
import { testCreateResi } from "@/app/actions/resi";
import { ResiData } from "@/lib/resi-constants";
import { useAlert } from "@/hooks/use-alert";
import { cn } from "@/lib/utils";

export default function ApiConfigManager() {
  const { showAlert, showError } = useAlert();
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingResi, setIsTestingResi] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"connection" | "sender" | "test">(
    "connection",
  );

  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Sender Config
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testResiResult, setTestResiResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await getAllApiSettings();
      setApiEndpoint(settings.apiEndpoint || "");
      setApiKey(settings.apiKey || "");
      setSenderName(settings.senderName || "");
      setSenderPhone(settings.senderPhone || "");
      setSenderAddress(settings.senderAddress || "");
    } catch (error) {
      console.error("Failed to load API settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!apiEndpoint.trim()) {
      showError("API Endpoint harus diisi");
      return;
    }

    startTransition(async () => {
      const result = await saveApiSettings(
        apiEndpoint.trim(),
        apiKey.trim(),
        senderName.trim(),
        senderPhone.trim(),
        senderAddress.trim(),
      );

      if (result.success) {
        showAlert("Pengaturan berhasil disimpan");
      } else {
        showError(result.error || "Gagal menyimpan pengaturan");
      }
    });
  };

  const handleTestConnection = async () => {
    if (!apiEndpoint.trim()) {
      showError("API Endpoint harus diisi terlebih dahulu");
      return;
    }

    // Save first
    await saveApiSettings(
      apiEndpoint.trim(),
      apiKey.trim(),
      senderName.trim(),
      senderPhone.trim(),
      senderAddress.trim(),
    );

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testApiConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: "Gagal melakukan test koneksi",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestResi = async () => {
    if (!apiEndpoint.trim()) {
      showError("API Endpoint harus diisi terlebih dahulu");
      return;
    }

    // Save first
    await saveApiSettings(
      apiEndpoint.trim(),
      apiKey.trim(),
      senderName.trim(),
      senderPhone.trim(),
      senderAddress.trim(),
    );

    setIsTestingResi(true);
    setTestResiResult(null);

    try {
      const dummyData: ResiData = {
        sender_name: senderName || "Test Sender",
        sender_phone: senderPhone || "08123456789",
        sender_address: senderAddress || "Jl. Test Address No. 123",
        receiver_name: "Test Receiver",
        receiver_phone: "08987654321",
        receiver_address: "Jl. Test Receiver No. 456",
        notes: "Test API Connection",
        status: "pending",
      };

      const result = await testCreateResi(dummyData);
      setTestResiResult({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      setTestResiResult({
        success: false,
        message: "Terjadi kesalahan saat test kirim resi",
      });
    } finally {
      setIsTestingResi(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">
              Integrasi API Resi
            </h2>
            <p className="text-xs text-muted-foreground">
              Konfigurasi koneksi dan data pengirim
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending || isTesting || isTestingResi}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Simpan Perubahan
            </>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("connection")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
            activeTab === "connection"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          <Wifi className="w-4 h-4" />
          Koneksi
        </button>
        <button
          onClick={() => setActiveTab("sender")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
            activeTab === "sender"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          <User className="w-4 h-4" />
          Data Pengirim
        </button>
        <button
          onClick={() => setActiveTab("test")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
            activeTab === "test"
              ? "border-primary text-primary bg-primary/5"
              : "border-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          <AlertCircle className="w-4 h-4" />
          Testing
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "connection" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* API Endpoint */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe className="w-4 h-4 text-muted-foreground" />
                API Endpoint URL
              </label>
              <input
                type="url"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://ladministration.ichibot.id/api"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Base URL untuk API (tanpa /resi)
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Key className="w-4 h-4 text-muted-foreground" />
                API Key (X-API-Key)
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="ichibot_your_api_key_here"
                  className="w-full px-4 py-2.5 pr-12 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Key ini akan dikirim melalui header <code>X-API-Key</code>
              </p>
            </div>
          </div>
        )}

        {activeTab === "sender" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="w-4 h-4 text-muted-foreground" />
                Nama Pengirim Default
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="ICHIBOT"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Phone className="w-4 h-4 text-muted-foreground" />
                No. HP Pengirim
              </label>
              <input
                type="text"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Alamat Pengirim
              </label>
              <textarea
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="Alamat lengkap pengirim..."
                rows={3}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === "test" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Test Connection */}
            <div className="p-4 border border-border rounded-lg bg-card/50">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-500" />
                1. Test Koneksi Dasar
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Test koneksi sederhana ke endpoint untuk memastikan server dapat
                dijangkau.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 bg-background border border-border hover:bg-muted rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      Cek Koneksi
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                      testResult.success
                        ? "bg-green-500/10 text-green-600 border border-green-500/20"
                        : "bg-red-500/10 text-red-600 border border-red-500/20"
                    }`}
                  >
                    {testResult.success ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>

            {/* Test Create Resi */}
            <div className="p-4 border border-border rounded-lg bg-card/50">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-500" />
                2. Test Kirim Data (Dummy)
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Mencoba membuat resi dengan data dummy untuk memverifikasi
                payload dan response.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestResi}
                    disabled={isTestingResi}
                    className="px-4 py-2 bg-background border border-border hover:bg-muted rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isTestingResi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Test Kirim Resi
                      </>
                    )}
                  </button>
                </div>

                {testResiResult && (
                  <div
                    className={`p-3 rounded-lg text-xs font-mono whitespace-pre-wrap ${
                      testResiResult.success
                        ? "bg-green-500/5 text-green-700 border border-green-500/20"
                        : "bg-red-500/5 text-red-700 border border-red-500/20"
                    }`}
                  >
                    <div className="font-bold mb-1 flex items-center gap-2">
                      {testResiResult.success ? (
                        <span className="text-green-600">✓ Berhasil</span>
                      ) : (
                        <span className="text-red-600">✕ Gagal</span>
                      )}
                    </div>
                    {testResiResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
