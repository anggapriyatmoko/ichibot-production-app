import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAllowedForPage } from '@/lib/auth'
import ExpenseDashboardAdmin from '@/components/keuangan/expense-dashboard-admin'

export const metadata = {
    title: 'Dashboard Keuangan | Ichibot Production',
    description: 'Rekapitulasi pengeluaran seluruh user'
}


export default async function KeuanganDashboardPage() {
    const session: any = await getSession()

    if (!session?.user) {
        redirect('/login')
    }

    // Role admin required
    const isAllowed = await isAllowedForPage('/keuangan/dashboard')
    if (!isAllowed) {
        redirect('/dashboard')
    }

    // Use current month's expenses for initial render
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    const { getExpensesPaginated } = await import('@/app/actions/expense')
    const expensesRes = await getExpensesPaginated({
        page: 1,
        perPage: 10,
        filters: {
            startDateIso: startOfMonth.toISOString(),
            endDateIso: endOfMonth.toISOString(),
        }
    })

    const initialExpenses = expensesRes.success && expensesRes.products ? expensesRes.products : []
    const initialTotalCount = expensesRes.success ? (expensesRes as any).totalCount : 0
    const initialTotalPages = expensesRes.success ? (expensesRes as any).totalPages : 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Rekapitulasi Keuangan</h1>
                <p className="text-muted-foreground">Pantau seluruh data pengeluaran yang diinput oleh user.</p>
            </div>

            <ExpenseDashboardAdmin 
                initialExpenses={initialExpenses}
                initialTotalCount={initialTotalCount}
                initialTotalPages={initialTotalPages}
                serverSidePagination={true}
            />
        </div>
    )
}
