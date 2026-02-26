import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { isAllowedForPage } from '@/lib/auth'
import ExpenseDashboardAdmin from '@/components/keuangan/expense-dashboard-admin'

export const metadata = {
    title: 'Dashboard Keuangan | Ichibot Production',
    description: 'Rekapitulasi pengeluaran seluruh user'
}

export const dynamic = 'force-dynamic'

export default async function KeuanganDashboardPage() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    // Role admin required
    const isAllowed = await isAllowedForPage('/keuangan/dashboard')
    if (!isAllowed) {
        redirect('/dashboard')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Rekapitulasi Keuangan</h1>
                <p className="text-muted-foreground">Pantau seluruh data pengeluaran yang diinput oleh user.</p>
            </div>

            <ExpenseDashboardAdmin />
        </div>
    )
}
