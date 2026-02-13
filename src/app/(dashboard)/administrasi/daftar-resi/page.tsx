import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/auth";
import ResiManager from "@/components/administrasi/resi-manager";
import { getResis } from "@/app/actions/resi";

type UserSession = {
  user?: {
    role?: string;
  };
};

export default async function DaftarResiPage() {
  await requireAuth();
  const session = (await getServerSession(authOptions)) as UserSession | null;

  if (
    !session?.user?.role ||
    !["ADMIN", "HRD", "ADMINISTRASI", "USER", "TEKNISI"].includes(
      session.user.role
    )
  ) {
    redirect("/dashboard");
  }

  // Fetch initial data
  const result = await getResis({ per_page: 15 });
  const initialResis = result.data?.resis || [];
  const initialPagination = result.data?.pagination;

  return (
    <div className="max-width-7xl mx-auto px-4 sm:px-0">
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
