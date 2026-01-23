import GenericDocManager from '@/components/administrasi/generic-doc-manager'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function MOUPage() {
    const session: any = await getServerSession(authOptions)

    if (!session || !['ADMIN', 'HRD', 'ADMINISTRASI'].includes(session.user.role)) {
        redirect('/dashboard')
    }

    const data = await prisma.mOU.findMany({
        orderBy: { createdAt: 'desc' }
    })

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
