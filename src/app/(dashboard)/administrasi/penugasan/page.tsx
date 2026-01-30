import { Metadata } from "next";
import SuratTugasManager from "@/components/administrasi/surat-tugas-manager";
import { getSuratTugas } from "@/app/actions/surat-tugas";

export const metadata: Metadata = {
  title: "Penugasan | Ichibot Admin",
  description: "Manajemen surat tugas dan penugasan karyawan Ichibot.",
};

export default async function PenugasanPage() {
  const initialData = await getSuratTugas(1);

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Penugasan</h1>
          <p className="text-muted-foreground mt-1">
            Kelola dan terbitkan surat tugas resmi untuk karyawan secara
            efisien.
          </p>
        </div>
      </div>

      {/* Main Component */}
      <SuratTugasManager
        initialData={initialData.data}
        totalCount={initialData.meta?.total || 0}
      />
    </div>
  );
}
