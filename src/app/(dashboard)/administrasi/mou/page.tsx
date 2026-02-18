import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import { redirect } from 'next/navigation'
import { getDocs } from '@/app/actions/administrasi'
import { requireAuth, isAllowedForPage } from '@/lib/auth'

export default async function MOUPage() {
    await requireAuth()
    const allowed = await isAllowedForPage('/administrasi/mou', ['ADMIN', 'HRD', 'ADMINISTRASI'])
    if (!allowed) redirect('/dashboard')


    const data = await getDocs('mou')

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="mb-8 text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">MoU (Kerjasama)</h1>
                <p className="text-muted-foreground">Kelola data Memorandum of Understanding atau dokumen kerjasama.</p>
            </div>

            <GenericDocManager
                type="mou"
                title="MoU"
                initialData={data}
                labels={{
                    number: 'No. Dokumen MoU',
                    content: 'Perihal Kerjasama'
                }}
            />
        </div>
    )
}
