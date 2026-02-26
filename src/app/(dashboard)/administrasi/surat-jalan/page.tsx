import { Metadata } from "next";
import { redirect } from "next/navigation";
import SuratJalanManager from "@/components/administrasi/surat-jalan-manager";
import { getSuratJalan } from "@/app/actions/surat-jalan";
import { requireAuth, isAllowedForPage } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Surat Jalan | Ichibot Admin",
  description: "Manajemen surat jalan dan pengiriman barang Ichibot.",
};

export default async function SuratJalanPage() {
  await requireAuth();
  const allowed = await isAllowedForPage('/administrasi/surat-jalan');
  if (!allowed) redirect("/dashboard");


  const initialData = await getSuratJalan(1);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Surat Jalan</h1>
          <p className="text-muted-foreground mt-1">
            Pantau dan kelola pengiriman barang keluar secara profesional.
          </p>
        </div>
      </div>

      {/* Main Component */}
      <SuratJalanManager
        initialData={initialData.data}
        totalCount={initialData.meta?.total || 0}
      />
    </div>
  );
}
