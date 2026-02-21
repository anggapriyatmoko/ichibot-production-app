import { redirect } from 'next/navigation'
import { requireAuth, isAllowedForPage } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function HumanResourcePage() {
    await requireAuth()
    const allowed = await isAllowedForPage('/human-resource', ['ADMIN', 'HRD', 'ADMINISTRASI'])
    if (!allowed) redirect('/dashboard')


    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Human Resource</h1>
                <p className="text-muted-foreground">Kelola data sumber daya manusia.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-12 text-center">
                <p className="text-muted-foreground">Halaman Human Resource sedang dalam pengembangan.</p>
            </div>
        </div>
    )
}
