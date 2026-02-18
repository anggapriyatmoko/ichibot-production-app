import { requireAuth, isAllowedForPage } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoiceGANManager from "@/components/administrasi/invoice-gan-manager";

export const metadata = {
  title: "Invoice GAN | Ichibot Production",
  description: "Kelola invoice GAN",
};

export const dynamic = "force-dynamic";

export default async function InvoiceGANPage() {
  await requireAuth();
  const allowed = await isAllowedForPage('/administrasi/invoice-gan', ['ADMIN', 'HRD', 'ADMINISTRASI']);
  if (!allowed) redirect("/dashboard");


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
