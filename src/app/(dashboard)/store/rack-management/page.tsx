import { requireAuth, isAllowedForPage } from "@/lib/auth"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import StoreRackManager from "@/components/store/store-rack-manager"
import { redirect } from 'next/navigation'

export const metadata = {
    title: 'Store Rak Management | Ichibot Production',
    description: 'Manage store product rack storage',
}

export default async function StoreRackManagementPage() {
    await requireAuth()
    const session: any = await getServerSession(authOptions)
    const userRole = session?.user?.role

    const allowed = await isAllowedForPage('/store/rack-management', ['ADMIN', 'USER', 'TEKNISI', 'HRD', 'ADMINISTRASI']);
    if (!allowed) redirect('/dashboard');

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Rak Management (Store)</h1>
                <p className="text-muted-foreground">Kelola lokasi penyimpanan produk store pada rak.</p>
            </div>
            <StoreRackManager userRole={userRole} />
        </div>
    )
}
