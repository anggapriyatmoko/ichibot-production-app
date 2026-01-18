import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HumanResourcePage() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    // Only ADMIN and HRD can access this page
    if (!['ADMIN', 'HRD'].includes(session?.user?.role)) {
        redirect('/dashboard')
    }

    return (
        <div className="max-w-7xl mx-auto">
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
