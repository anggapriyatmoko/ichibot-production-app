import { requireAuth } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import InvoiceManager from "@/components/administrasi/invoice-manager";

export const metadata = {
  title: "Invoice (ID) | Ichibot Production",
  description: "Kelola invoice dalam bahasa Indonesia",
};

export const dynamic = "force-dynamic";

interface UserSession {
  user?: {
    role?: string;
  };
}

export default async function InvoiceIDPage() {
  await requireAuth();
  const session = (await getServerSession(authOptions)) as UserSession | null;

  // Only allow ADMIN, HRD, and ADMINISTRASI
  if (
    !session?.user?.role ||
    !["ADMIN", "HRD", "ADMINISTRASI"].includes(session.user.role)
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="max-width-7xl mx-auto px-4 sm:px-0">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
          Invoice (ID)
        </h1>
        <p className="text-muted-foreground">
          Kelola invoice dalam bahasa Indonesia. Data tersinkronisasi dengan
          administration.ichibot.id
        </p>
      </div>

      <InvoiceManager />
    </div>
  );
}
