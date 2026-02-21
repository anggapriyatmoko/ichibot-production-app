import { requireAdmin } from '@/lib/auth'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/app/actions/category'
import { getSectionCategories, createSectionCategory, updateSectionCategory, deleteSectionCategory } from '@/app/actions/section-category'
import CategorySettingsManager from '@/components/catalogue/category-settings-manager'
import { BookOpen, Layers, Settings } from 'lucide-react'
import prisma from '@/lib/prisma'
import TransactionHistoryTable from '@/components/catalogue/transaction-history-table'
import { decrypt } from '@/lib/crypto'

export default async function CatalogueSettingsPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; startDate?: string; endDate?: string; search?: string }>
}) {
    const session = await requireAdmin()


    const params = await searchParams
    const page = typeof params.page === 'string' ? parseInt(params.page) : 1
    const limit = 10
    const skip = (page - 1) * limit
    const search = typeof params.search === 'string' ? params.search : ''

    const productCategories = await getCategories()
    const sectionCategories = await getSectionCategories()

    // Transaction History Logic
    const whereClause: any = {}
    if (params.startDate || params.endDate) {
        whereClause.createdAt = {}
        if (params.startDate) whereClause.createdAt.gte = new Date(params.startDate)
        if (params.endDate) {
            const endDate = new Date(params.endDate)
            endDate.setHours(23, 59, 59, 999)
            whereClause.createdAt.lte = endDate
        }
    }
    if (search) {
        whereClause.OR = [
            { description: { contains: search } },
            { product: { name: { contains: search } } }
        ]
    }

    const [rawTransactions, totalCount] = await Promise.all([
        prisma.transaction.findMany({
            where: whereClause,
            include: {
                product: true,
                recipe: true,
                user: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip
        }),
        prisma.transaction.count({ where: whereClause })
    ])

    const transactions = rawTransactions.map(tx => ({
        ...tx,
        user: tx.user ? {
            ...tx.user,
            name: decrypt(tx.user.nameEnc),
            username: decrypt(tx.user.usernameEnc)
        } : null
    }))

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <Settings className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Setting Katalog</h1>
                </div>
                <p className="text-muted-foreground max-w-2xl">
                    Kelola kategori produk untuk katalog, kategori section recipe, dan pantau riwayat mutasi barang.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                <CategorySettingsManager
                    title="Kategori Product Ichibot"
                    description="Kategori utama produk yang tampil di Catalogue."
                    iconName="product"
                    initialCategories={productCategories}
                    placeholder="Contoh: Micro, Shield, Controller..."
                    onCreate={createCategory}
                    onUpdate={updateCategory}
                    onDelete={deleteCategory}
                />

                <CategorySettingsManager
                    title="Kategori Section"
                    description="Pilihan kategori untuk mengelompokkan section dalam Recipe."
                    iconName="section"
                    initialCategories={sectionCategories}
                    placeholder="Contoh: Solder, Packaging, Assembly..."
                    onCreate={createSectionCategory}
                    onUpdate={updateSectionCategory}
                    onDelete={deleteSectionCategory}
                />
            </div>

            <hr className="border-border" />

            <TransactionHistoryTable
                transactions={transactions}
                totalCount={totalCount}
                currentPage={page}
                limit={limit}
                totalPages={totalPages}
                search={search}
                startDate={params.startDate}
                endDate={params.endDate}
            />
        </div>
    )
}
