import { getItems } from "@/app/actions/item";
import ItemManager from "@/components/administrasi/item-manager";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const metadata: Metadata = {
  title: "Permintaan Barang | Ichibot Production",
  description:
    "Kelola permintaan pengadaan barang dari berbagai divisi secara real-time.",
};

export default async function PermintaanBarangPage() {
  const [result, session] = await Promise.all([
    getItems(),
    getServerSession(authOptions),
  ]);

  const userRole = (session as any)?.user?.role || "";
  const userName = (session as any)?.user?.name || "";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
