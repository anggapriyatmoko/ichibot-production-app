import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import { redirect } from 'next/navigation'
import { getDocs } from '@/app/actions/administrasi'
import { requireAuth, isAllowedForPage } from '@/lib/auth'

export default async function SuratBalasanPage() {
    await requireAuth()
    const allowed = await isAllowedForPage('/administrasi/surat-balasan')
    if (!allowed) redirect('/dashboard')


    const data = await getDocs('surat-balasan')

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Surat Balasan</h1>
                <p className="text-muted-foreground">Kelola data surat balasan dari instansi atau pelanggan.</p>
            </div>

            <GenericDocManager
                type="surat-balasan"
                title="Surat Balasan"
                initialData={data}
                labels={{
                    number: 'No. Surat Balasan',
                    content: 'Perihal / Isi Balasan'
                }}
            />
        </div>
    )
}
