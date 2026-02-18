import { requireAuth, isAllowedForPage } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoiceEnglishManager from "@/components/administrasi/invoice-english-manager";

export const metadata = {
  title: "Invoice (EN) | Ichibot Production",
  description: "Manage invoices in English language",
};

export const dynamic = "force-dynamic";

export default async function InvoiceENPage() {
  await requireAuth();
  const allowed = await isAllowedForPage('/administrasi/invoice-en', ['ADMIN', 'HRD', 'ADMINISTRASI']);
  if (!allowed) redirect("/dashboard");


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
