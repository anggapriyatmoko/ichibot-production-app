import { requireAuth, isAllowedForPage } from "@/lib/auth";
import { redirect } from "next/navigation";
import InvoiceGASManager from "@/components/administrasi/invoice-gas-manager";

export const metadata = {
  title: "Invoice GAS | Ichibot Production",
  description: "Kelola invoice GAS",
};

export const dynamic = "force-dynamic";

export default async function InvoiceGASPage() {
  await requireAuth();
  const allowed = await isAllowedForPage('/administrasi/invoice-gas');
  if (!allowed) redirect("/dashboard");


  return (
    <div className="space-y-8">
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
          Invoice GAS
        </h1>
        <p className="text-muted-foreground">
          Kelola invoice GAS. Data tersinkronisasi dengan
          administration.ichibot.id
        </p>
      </div>

      <InvoiceGASManager />
    </div>
  );
}
