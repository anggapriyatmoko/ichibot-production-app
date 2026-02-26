import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { isAllowedForPage } from '@/lib/auth'
import ExpenseCategoryManager from '@/components/keuangan/expense-category-manager'
import { getExpenseCategories } from '@/app/actions/expense-category'

export const metadata = {
    title: 'Setting Keuangan | Ichibot Production',
    description: 'Manajemen kategori pengeluaran'
}

export const dynamic = 'force-dynamic'

export default async function KeuanganSettingPage() {
    const session: any = await getServerSession(authOptions)

    if (!session?.user) {
        redirect('/login')
    }

    const isAllowed = await isAllowedForPage('/keuangan/setting')
    if (!isAllowed) {
        redirect('/dashboard')
    }

    const categoriesRes = await getExpenseCategories()
    const categories = categoriesRes.success && categoriesRes.data ? categoriesRes.data : []

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Setting Keuangan</h1>
                <p className="text-muted-foreground">Kelola master data untuk modul keuangan, seperti kategori pengeluaran.</p>
            </div>

            <ExpenseCategoryManager initialCategories={categories} />
        </div>
    )
}
