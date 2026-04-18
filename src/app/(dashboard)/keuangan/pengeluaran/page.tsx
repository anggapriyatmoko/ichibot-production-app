import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ExpenseListUser from '@/components/keuangan/expense-list-user'
import { getExpenses, getExpensesPaginated } from '@/app/actions/expense'
import { getExpenseCategories } from '@/app/actions/expense-category'

export const metadata = {
    title: 'Pengeluaran | Ichibot Production',
    description: 'Manajemen pengeluaran user'
}


export default async function PengeluaranPage() {
    const session: any = await getSession()

    if (!session?.user) {
        redirect('/login')
    }

    // Use current user's ID
    const userId = session.user.id

    // Only fetch current month's expenses for initial render (performance fix)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    endOfMonth.setHours(23, 59, 59, 999)

    const [expensesRes, categoriesRes] = await Promise.all([
        getExpensesPaginated({
            page: 1,
            perPage: 10,
            filters: {
                userId,
                startDateIso: startOfMonth.toISOString(),
                endDateIso: endOfMonth.toISOString(),
            }
        }),
        getExpenseCategories()
    ])

    const expenses = expensesRes.success && expensesRes.products ? expensesRes.products : []
    const totalCount = expensesRes.success ? expensesRes.totalCount : 0
    const totalPages = expensesRes.success ? expensesRes.totalPages : 0
    const categories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : []

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Pengeluaran Anda</h1>
                <p className="text-muted-foreground">Catat dan kelola riwayat pengeluaran pribadi Anda.</p>
            </div>

            <ExpenseListUser 
                userId={userId} 
                initialExpenses={expenses} 
                initialTotalCount={totalCount}
                initialTotalPages={totalPages}
                serverSidePagination={true}
                categories={categories} 
            />
        </div>
    )
}
