import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { getDocs } from '@/app/actions/administrasi'

export default async function SuratBalasanPage() {
    const session: any = await getServerSession(authOptions)

    if (!session || !['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session.user.role)) {
        redirect('/dashboard')
    }

    const data = await getDocs('surat-balasan')

    return (
        <div className="max-w-7xl mx-auto space-y-6">
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
