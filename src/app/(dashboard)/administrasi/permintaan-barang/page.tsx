import { getItems } from "@/app/actions/item";
import ItemManager from "@/components/administrasi/item-manager";
import { Metadata } from "next";
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: "Permintaan Barang | Ichibot Production",
  description:
    "Kelola permintaan pengadaan barang dari berbagai divisi secara real-time.",
};

export default async function PermintaanBarangPage() {
  const [result, session] = await Promise.all([
    getItems(),
    getSession(),
  ]);

  const userRole = (session as any)?.user?.role || "";
  const userName = (session as any)?.user?.name || "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Permintaan Barang
        </h1>
        <p className="text-muted-foreground">
          Pantau dan kelola permintaan pengadaan barang dari berbagai divisi
          secara real-time.
        </p>
      </div>

      <ItemManager
        initialItems={result.data?.items || []}
        initialPagination={result.data?.pagination}
        userRole={userRole}
        userName={userName}
      />
    </div>
  );
}
