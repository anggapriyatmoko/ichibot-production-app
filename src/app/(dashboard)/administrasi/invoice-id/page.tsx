import { requireAuth, isAllowedForPage } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoiceManager from "@/components/administrasi/invoice-manager";

export const metadata = {
  title: "Invoice (ID) | Ichibot Production",
  description: "Kelola invoice dalam bahasa Indonesia",
};

export const dynamic = "force-dynamic";

export default async function InvoiceIDPage() {
  await requireAuth();
  const allowed = await isAllowedForPage('/administrasi/invoice-id', ['ADMIN', 'HRD', 'ADMINISTRASI']);
  if (!allowed) redirect("/dashboard");


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
