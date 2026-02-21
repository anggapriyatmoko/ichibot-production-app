import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import { redirect } from 'next/navigation'
import { getDocs } from '@/app/actions/administrasi'
import { requireAuth, isAllowedForPage } from '@/lib/auth'

export default async function SuratUndanganPage() {
    await requireAuth()
    const allowed = await isAllowedForPage('/administrasi/surat-undangan', ['ADMIN', 'HRD', 'ADMINISTRASI'])
    if (!allowed) redirect('/dashboard')


    const data = await getDocs('surat-undangan')

    return (
        <div className="space-y-8">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Surat Undangan</h1>
                <p className="text-muted-foreground">Kelola data surat undangan kegiatan atau pertemuan.</p>
            </div>

            <GenericDocManager
                type="surat-undangan"
                title="Surat Undangan"
                initialData={data}
                labels={{
                    number: 'No. Surat Undangan',
                    content: 'Perihal / Isi Undangan'
                }}
            />
        </div>
    )
}
