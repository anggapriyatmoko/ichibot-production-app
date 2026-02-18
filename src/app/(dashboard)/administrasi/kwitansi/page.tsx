import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import { redirect } from 'next/navigation'
import { getDocs } from '@/app/actions/administrasi'
import { requireAuth, isAllowedForPage } from '@/lib/auth'

export default async function KwitansiPage() {
    await requireAuth()
    const allowed = await isAllowedForPage('/administrasi/kwitansi', ['ADMIN', 'HRD', 'ADMINISTRASI'])
    if (!allowed) redirect('/dashboard')


    const data = await getDocs('kwitansi')

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Kwitansi</h1>
                <p className="text-muted-foreground">Kelola data kwitansi pembayaran atau penerimaan.</p>
            </div>

            <GenericDocManager
                type="kwitansi"
                title="Kwitansi"
                initialData={data}
                labels={{
                    number: 'No. Kwitansi',
                    content: 'Keterangan Pembayaran'
                }}
            />
        </div>
    )
}
