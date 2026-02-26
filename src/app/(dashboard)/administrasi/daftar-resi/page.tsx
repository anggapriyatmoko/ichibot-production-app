import { redirect } from "next/navigation";
import { requireAuth, isAllowedForPage } from "@/lib/auth";
import ResiManager from "@/components/administrasi/resi-manager";
import { getResis } from "@/app/actions/resi";

export default async function DaftarResiPage() {
  await requireAuth();
  const allowed = await isAllowedForPage('/administrasi/daftar-resi');
  if (!allowed) redirect("/dashboard");


  // Fetch initial data
  const result = await getResis({ per_page: 15 });
  const initialResis = result.data?.resis || [];
  const initialPagination = result.data?.pagination;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
        Daftar Resi
      </h1>
      <p className="text-muted-foreground mb-6">
        Kelola data resi pengiriman. Data tersinkronisasi dengan
        administration.ichibot.id
      </p>
      <ResiManager
        initialData={initialResis}
        initialPagination={initialPagination}
      />
    </div>
  );
}
