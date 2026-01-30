import { requireAuth } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import InvoiceEnglishManager from "@/components/administrasi/invoice-english-manager";

export const metadata = {
  title: "Invoice (EN) | Ichibot Production",
  description: "Manage invoices in English language",
};

export const dynamic = "force-dynamic";

interface UserSession {
  user?: {
    role?: string;
  };
}

export default async function InvoiceENPage() {
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
          Invoice (EN)
        </h1>
        <p className="text-muted-foreground">
          Manage invoices in English language. Data is synchronized with
          administration.ichibot.id
        </p>
      </div>

      <InvoiceEnglishManager />
    </div>
  );
}
