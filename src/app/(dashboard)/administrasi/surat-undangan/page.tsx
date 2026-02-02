import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function SuratUndanganPage() {
    const session: any = await getServerSession(authOptions)

    if (!session || !['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session.user.role)) {
        redirect('/dashboard')
    }

    const data = await (prisma as any).invitationLetter.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="max-w-7xl mx-auto space-y-6">
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
