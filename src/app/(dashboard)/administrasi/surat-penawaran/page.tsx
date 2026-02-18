import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import { redirect } from 'next/navigation'
import { getDocs } from '@/app/actions/administrasi'
import { requireAuth, isAllowedForPage } from '@/lib/auth'

export default async function SuratPenawaranPage() {
    await requireAuth()
    const allowed = await isAllowedForPage('/administrasi/surat-penawaran', ['ADMIN', 'HRD', 'ADMINISTRASI'])
    if (!allowed) redirect('/dashboard')


    const data = await getDocs('surat-penawaran')

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Surat Penawaran</h1>
                <p className="text-muted-foreground">Kelola data surat penawaran ke instansi atau pelanggan.</p>
            </div>

            <GenericDocManager
                type="surat-penawaran"
                title="Surat Penawaran"
                initialData={data}
                labels={{
                    number: 'No. Surat Penawaran',
                    content: 'Perihal / Isi Penawaran'
                }}
            />
        </div>
    )
}
