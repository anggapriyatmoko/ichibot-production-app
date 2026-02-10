import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SuratJalanManager from "@/components/administrasi/surat-jalan-manager";
import { getSuratJalan } from "@/app/actions/surat-jalan";

export const metadata: Metadata = {
  title: "Surat Jalan | Ichibot Admin",
  description: "Manajemen surat jalan dan pengiriman barang Ichibot.",
};

export default async function SuratJalanPage() {
  const session: any = await getServerSession(authOptions);

  if (
    !session ||
    !["ADMIN", "HRD", "ADMINISTRASI"].includes(session.user.role)
  ) {
    redirect("/dashboard");
  }

  const initialData = await getSuratJalan(1);

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
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
