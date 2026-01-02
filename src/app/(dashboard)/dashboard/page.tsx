import prisma from '@/lib/prisma'
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    // 1. Fetch Stats
    const totalProducts = await prisma.product.count()

    // Low stock count (doing this in JS to ensure accuracy with thresholds, or raw query)
    // For small datasets, fetching all is fine. For large, use raw query or aggregated view.
    // Let's use a filter where stock <= lowStockThreshold - tricky in standard Prisma without raw where
    // So we'll fetch ID/Stock/Threshold for calculation
    const allProducts = await prisma.product.findMany({
        select: { stock: true, lowStockThreshold: true }
    })
    const lowStockCount = allProducts.filter((p: { stock: number; lowStockThreshold: number }) => p.stock <= p.lowStockThreshold).length

    // Today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todaysTransactions = await prisma.transaction.findMany({
        where: { createdAt: { gte: today } }
    })

    const itemsIn = todaysTransactions
        .filter((t: { type: string }) => t.type === 'IN')
        .reduce((acc: number, t: { quantity: number }) => acc + t.quantity, 0)

    const itemsOut = todaysTransactions
        .filter((t: { type: string }) => t.type === 'OUT')
        .reduce((acc: number, t: { quantity: number }) => acc + t.quantity, 0)

    // Recent Activity
    const recentActivity = await prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: true }
    })

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your inventory status today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Products</p>
                            <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Low Stock Items</p>
                            <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <ArrowDownLeft className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Restocked Today</p>
                            <p className="text-2xl font-bold text-foreground">+{itemsIn}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Items Out Today</p>
                            <p className="text-2xl font-bold text-foreground">-{itemsOut}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-border flex justify-between items-center">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Clock className="w-5 h-5 text-muted-foreground" />
                            Recent Activity
                        </h2>
                        <Link href="/history" className="text-sm text-primary hover:text-blue-500">View All</Link>
                    </div>
                    <div className="divide-y divide-border">
                        {recentActivity.map((tx: any) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${tx.type === 'IN' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                        {tx.type === 'IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-foreground font-medium">{tx.product?.name}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                                <span className={`font-bold ${tx.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                    {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                                </span>
                            </div>
                        ))}
                        {recentActivity.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">No activity recorded yet.</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                        <h3 className="font-bold text-lg mb-2">Quick Restock</h3>
                        <p className="text-blue-100 text-sm mb-4">Add new items or update stock levels.</p>
                        <Link href="/inventory" className="block w-full py-3 bg-white text-blue-600 font-bold text-center rounded-xl hover:bg-blue-50 transition-colors">
                            Go to Inventory
                        </Link>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                        <h3 className="font-bold text-lg mb-2">Process Order</h3>
                        <p className="text-emerald-100 text-sm mb-4">Checkout materials for production.</p>
                        <Link href="/checkout" className="block w-full py-3 bg-white text-emerald-600 font-bold text-center rounded-xl hover:bg-emerald-50 transition-colors">
                            Go to POS
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
