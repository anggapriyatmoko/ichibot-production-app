import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/auth";
import ResiManager from "@/components/administrasi/resi-manager";

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
    !["ADMIN", "HRD", "ADMINISTRASI"].includes(session.user.role)
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="max-width-7xl mx-auto px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
        Daftar Resi
      </h1>
      <p className="text-muted-foreground mb-6">
        Kelola data resi pengiriman. Data tersinkronisasi dengan
        administration.ichibot.id
      </p>
      <ResiManager />
    </div>
  );
}
