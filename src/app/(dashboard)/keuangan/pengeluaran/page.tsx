import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import ExpenseListUser from '@/components/keuangan/expense-list-user'
import { getExpenses } from '@/app/actions/expense'
import { getExpenseCategories } from '@/app/actions/expense-category'

export const metadata = {
    title: 'Pengeluaran | Ichibot Production',
    description: 'Manajemen pengeluaran user'
}

export const dynamic = 'force-dynamic'

export default async function PengeluaranPage() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    // Use current user's ID
    const userId = session.user.id

    const [expensesRes, categoriesRes] = await Promise.all([
        getExpenses(userId),
        getExpenseCategories()
    ])

    const expenses = expensesRes.success && expensesRes.data ? expensesRes.data : []
    const categories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : []

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Pengeluaran Anda</h1>
                <p className="text-muted-foreground">Catat dan kelola riwayat pengeluaran pribadi Anda.</p>
            </div>

            <ExpenseListUser userId={userId} initialExpenses={expenses} categories={categories} />
        </div>
    )
}
