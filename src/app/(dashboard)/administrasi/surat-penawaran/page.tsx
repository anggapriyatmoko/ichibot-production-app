import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function SuratPenawaranPage() {
    const session: any = await getServerSession(authOptions)

    // Authorization check
    if (!session || !['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session.user.role)) {
        redirect('/dashboard')
    }

    const data = await prisma.offerLetter.findMany({
        orderBy: { createdAt: 'desc' }
    })

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
