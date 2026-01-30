import { requireAuth } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import InvoiceGANManager from "@/components/administrasi/invoice-gan-manager";

export const metadata = {
  title: "Invoice GAN | Ichibot Production",
  description: "Kelola invoice GAN",
};

export const dynamic = "force-dynamic";

interface UserSession {
  user?: {
    role?: string;
  };
}

export default async function InvoiceGANPage() {
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
          Invoice GAN
        </h1>
        <p className="text-muted-foreground">
          Kelola invoice GAN. Data tersinkronisasi dengan
          administration.ichibot.id
        </p>
      </div>

      <InvoiceGANManager />
    </div>
  );
}
