import { redirect } from "next/navigation";
import { requireAuth, isAllowedForPage } from "@/lib/auth";
import CertificateManager from "@/components/administrasi/certificate-manager";

export default async function CertificatePage() {
  await requireAuth();
  const allowed = await isAllowedForPage('/administrasi/certificate');
  if (!allowed) redirect("/dashboard");


  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
        Certificate
      </h1>
      <p className="text-muted-foreground mb-6">
        Kelola sertifikat. Data tersinkronisasi dengan administration.ichibot.id
      </p>
      <CertificateManager />
    </div>
  );
}
