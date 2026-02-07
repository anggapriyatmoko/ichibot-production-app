import { getStoreSuppliers } from '@/app/actions/store-supplier'
import StoreSupplierManager from '@/components/store/store-supplier-manager'
import { Settings } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function StoreSettingsPage() {
    const role = await getUserRole()
    if (role !== 'ADMIN') {
        redirect('/dashboard')
    }

    const suppliers = await getStoreSuppliers()

    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <Settings className="w-6 h-6 text-primary" />
                    <h1 className="text-2xl font-bold tracking-tight">Store Settings</h1>
                </div>
                <p className="text-muted-foreground">
                    Pengaturan operasional toko dan manajemen data pendukung.
                </p>
            </div>

            <div className="grid gap-8">
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold border-b border-border pb-2">Manajemen Supplier</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Kelola daftar supplier untuk keperluan pengadaan stok barang.
                        </p>
                    </div>

                    <StoreSupplierManager initialSuppliers={suppliers} />
                </section>

                {/* Additional settings sections can be added here in the future */}
            </div>
        </div>
    )
}
