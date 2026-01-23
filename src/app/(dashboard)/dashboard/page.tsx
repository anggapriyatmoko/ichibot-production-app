import prisma from '@/lib/prisma'
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Clock, Calendar, History, Plus, Minus, CheckCircle, Edit2, Bot, Wrench } from 'lucide-react'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import ProductionOverviewTable from './components/production-overview-table'
import MonthYearSelector from './components/month-year-selector'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ year?: string, lastMonth?: string, lastYear?: string }> }) {
    const params = await searchParams
    const selectedYear = Number(params?.year) || new Date().getFullYear()

    // Calculate default last month
    const today = new Date()
    const defaultLastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const selectedLastMonth = Number(params?.lastMonth) || (defaultLastMonthDate.getMonth() + 1)
    const selectedLastYear = Number(params?.lastYear) || defaultLastMonthDate.getFullYear()

    // 1. Fetch Stats
    const totalProducts = await prisma.product.count()
    const totalRecipes = await prisma.recipe.count()

    // Low stock count (doing this in JS to ensure accuracy with thresholds, or raw query)
    // For small datasets, fetching all is fine. For large, use raw query or aggregated view.
    // Let's use a filter where stock <= lowStockThreshold - tricky in standard Prisma without raw where
    // So we'll fetch ID/Stock/Threshold for calculation
    const allProducts = await prisma.product.findMany({
        select: { stock: true, lowStockThreshold: true }
    })
    const lowStockCount = allProducts.filter((p: { stock: number; lowStockThreshold: number }) => p.stock <= p.lowStockThreshold).length

    // Today's stats (reuse today from above)
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

    // Production Stats (This Month vs Selected Last Month)
    const currentMonth = today.getMonth() + 1
    const currentYear = today.getFullYear() // For the top cards, keep using current real year

    const [currentMonthPlans, lastMonthPlans, allRecipes, annualPlans] = await Promise.all([
        prisma.productionPlan.findMany({
            where: { month: currentMonth, year: currentYear },
            include: {
                units: true,
                recipe: {
                    include: {
                        sections: true,
                        category: true
                    }
                }
            }
        }),
        prisma.productionPlan.findMany({
            where: { month: selectedLastMonth, year: selectedLastYear },
            include: {
                units: true,
                recipe: {
                    include: {
                        sections: true,
                        category: true
                    }
                }
            }
        }),
        prisma.recipe.findMany({
            orderBy: { name: 'asc' },
            include: { sections: true, category: true }
        }),
        prisma.productionPlan.findMany({
            where: { year: selectedYear },
            include: {
                units: true,
                recipe: { include: { sections: true } }
            }
        })
    ])

    // Process data for Overview Table
    const overviewData = allRecipes
        .filter(recipe => annualPlans.some(p => p.recipeId === recipe.id))
        .map(recipe => {
            const monthlyData = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1
                const itemPlan = annualPlans.find(p => p.recipeId === recipe.id && p.month === month)

                if (!itemPlan) return { month, plan: 0, done: 0 }

                const totalSections = recipe.sections.length
                const doneCount = itemPlan.units.filter(u => !!u.assembledAt).length

                return {
                    month,
                    plan: itemPlan.quantity,
                    done: doneCount // "Done" means assembled -> all ingredients checked
                }
            })

            return {
                productName: recipe.name,
                category: recipe.category?.name || 'Uncategorized',
                monthlyData
            }
        })

    const calculateStats = (plans: any[]) => {
        const planned = plans.reduce((acc, p) => acc + p.quantity, 0)
        let packed = 0
        let sold = 0
        let assembled = 0

        plans.forEach(p => {
            p.units.forEach((u: any) => {

                if (u.isSold) {
                    sold++
                } else if (u.isPacked) {
                    packed++
                } else if (u.assembledAt) {
                    assembled++
                }
            })
        })
        return { planned, packed, sold, assembled }
    }

    const currentStats = calculateStats(currentMonthPlans)
    const lastStats = calculateStats(lastMonthPlans)

    // Recent Activity
    const recentActivity = await prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: true }
    })

    // Service Robot Stats
    const serviceRobotStats = await prisma.serviceRobot.groupBy({
        by: ['serviceStatus'],
        _count: {
            serviceStatus: true
        }
    })

    const serviceStats = {
        pending: 0,
        inProgress: 0,
        done: 0,
        delivered: 0,
        total: 0
    }
    serviceRobotStats.forEach((stat: any) => {
        serviceStats.total += stat._count.serviceStatus
        if (stat.serviceStatus === 'PENDING') serviceStats.pending = stat._count.serviceStatus
        else if (stat.serviceStatus === 'IN_PROGRESS') serviceStats.inProgress = stat._count.serviceStatus
        else if (stat.serviceStatus === 'DONE') serviceStats.done = stat._count.serviceStatus
        else if (stat.serviceStatus === 'DELIVERED') serviceStats.delivered = stat._count.serviceStatus
    })

    return (
        <div className="w-[98%] max-w-[98%] mx-auto space-y-8">
            <div className="flex flex-col text-left items-start justify-between w-full">
                <div className="w-full text-left">
                    <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Dashboard</h1>
                    <p className="text-muted-foreground text-left">Overview of your inventory and production status.</p>
                </div>
            </div>

            {/* Annual Production Analysis Table (Top) */}
            <ProductionOverviewTable data={overviewData} year={selectedYear} />

            {/* Production Overview - Current Month */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* This Month - Detailed Breakdown */}
                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
                        <Calendar className="w-5 h-5 text-primary" />
                        Production This Month ({new Date().toLocaleString('default', { month: 'long' })})
                    </h3>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                        <div className="bg-indigo-100/50 dark:bg-indigo-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Planned</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{currentStats.planned}</p>
                        </div>
                        <div className="bg-purple-100/50 dark:bg-purple-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Assembled</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{currentStats.assembled}</p>
                        </div>
                        <div className="bg-blue-100/50 dark:bg-blue-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Packed</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentStats.packed}</p>
                        </div>
                        <div className="bg-emerald-100/50 dark:bg-emerald-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Sold</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{currentStats.sold}</p>
                        </div>
                    </div>

                    {/* Per Product List */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Breakdown</h4>
                        <div className="space-y-4">
                            {Object.entries(currentMonthPlans.reduce((acc: any, plan: any) => {
                                const category = plan.recipe.category?.name || 'Uncategorized'
                                if (!acc[category]) acc[category] = []
                                acc[category].push(plan)
                                return acc
                            }, {})).sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([category, plans]: [string, any]) => (
                                <div key={category}>
                                    <h5 className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-md inline-block mb-1">{category}</h5>
                                    <div>
                                        {plans.map((plan: any) => {
                                            let packedCount = 0
                                            let soldCount = 0
                                            let assembledCount = 0

                                            const sections = plan.recipe?.sections || []
                                            const validSectionIds = sections.map((s: any) => s.id)
                                            const totalSections = sections.length

                                            plan.units.forEach((u: any) => {
                                                if (u.isSold) {
                                                    soldCount++
                                                } else if (u.isPacked) {
                                                    packedCount++
                                                } else if (u.assembledAt) {
                                                    assembledCount++
                                                }
                                            })
                                            const notFinished = plan.quantity - packedCount - soldCount - assembledCount

                                            return (
                                                <Link key={plan.id} href={`/production-plan/${plan.id}`} className="block hover:bg-accent/50 transition-colors rounded-lg -mx-2 px-2 border-b border-border last:border-0 border-dashed">
                                                    <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-foreground text-sm">{plan.recipe.name}</p>
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-2 sm:flex sm:items-center sm:gap-4 text-xs w-full sm:w-auto">
                                                            <div className="text-center sm:w-14 bg-muted/30 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-foreground">{plan.quantity}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Plan</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-orange-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-orange-600 dark:text-orange-400">{notFinished}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pend</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((notFinished / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-purple-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-purple-600 dark:text-purple-400">{assembledCount}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Done</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((assembledCount / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-blue-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-blue-600 dark:text-blue-400">{packedCount}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pack</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((packedCount / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-emerald-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">{soldCount}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Sold</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((soldCount / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border p-6 rounded-2xl shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <History className="w-5 h-5 text-muted-foreground" />
                            Last Month ({new Date(selectedLastYear, selectedLastMonth - 1).toLocaleString('default', { month: 'long' })} {selectedLastYear})
                        </h3>
                        <MonthYearSelector selectedMonth={selectedLastMonth} selectedYear={selectedLastYear} />
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="bg-indigo-100/50 dark:bg-indigo-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Planned</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{lastStats.planned}</p>
                        </div>
                        <div className="bg-purple-100/50 dark:bg-purple-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Assembled</p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{lastStats.assembled}</p>
                        </div>
                        <div className="bg-blue-100/50 dark:bg-blue-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Packed</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lastStats.packed}</p>
                        </div>
                        <div className="bg-emerald-100/50 dark:bg-emerald-500/10 p-4 rounded-xl">
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Sold</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{lastStats.sold}</p>
                        </div>
                    </div>

                    {/* Per Product List (Last Month) */}
                    <div className="space-y-4 mt-8">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Product Breakdown</h4>
                        <div className="space-y-4">
                            {Object.entries(lastMonthPlans.reduce((acc: any, plan: any) => {
                                const category = plan.recipe.category?.name || 'Uncategorized'
                                if (!acc[category]) acc[category] = []
                                acc[category].push(plan)
                                return acc
                            }, {})).sort((a: any, b: any) => a[0].localeCompare(b[0])).map(([category, plans]: [string, any]) => (
                                <div key={category}>
                                    <h5 className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-md inline-block mb-1">{category}</h5>
                                    <div>
                                        {plans.map((plan: any) => {
                                            let packedCount = 0
                                            let soldCount = 0
                                            let assembledCount = 0

                                            const sections = plan.recipe?.sections || []
                                            const validSectionIds = sections.map((s: any) => s.id)
                                            const totalSections = sections.length

                                            plan.units.forEach((u: any) => {
                                                if (u.isSold) {
                                                    soldCount++
                                                } else if (u.isPacked) {
                                                    packedCount++
                                                } else if (u.assembledAt) {
                                                    assembledCount++
                                                }
                                            })
                                            const notFinished = plan.quantity - packedCount - soldCount - assembledCount

                                            return (
                                                <Link key={plan.id} href={`/production-plan/${plan.id}`} className="block hover:bg-accent/50 transition-colors rounded-lg -mx-2 px-2 border-b border-border last:border-0 border-dashed">
                                                    <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                                                        <div className="flex-1">
                                                            <p className="font-medium text-foreground text-sm">{plan.recipe.name}</p>
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-2 sm:flex sm:items-center sm:gap-4 text-xs w-full sm:w-auto">
                                                            <div className="text-center sm:w-14 bg-muted/30 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-foreground">{plan.quantity}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Plan</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-orange-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-orange-600 dark:text-orange-400">{notFinished}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pend</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((notFinished / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-purple-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-purple-600 dark:text-purple-400">{assembledCount}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Done</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((assembledCount / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-blue-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-blue-600 dark:text-blue-400">{packedCount}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pack</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((packedCount / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                            <div className="text-center sm:w-14 bg-emerald-500/5 sm:bg-transparent rounded p-1 sm:p-0">
                                                                <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">{soldCount}</p>
                                                                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Sold</p>
                                                                <p className="text-[9px] text-muted-foreground">{plan.quantity > 0 ? Math.round((soldCount / plan.quantity) * 100) : 0}%</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Service Robot Stats */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        Service Robot
                    </h3>
                    <Link href="/service-robot" className="text-sm text-primary hover:text-blue-500">View All</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-muted/30 p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-foreground">{serviceStats.total}</p>
                        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Total</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">{serviceStats.pending}</p>
                        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Masuk</p>
                    </div>
                    <div className="bg-blue-500/10 p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{serviceStats.inProgress}</p>
                        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Dikerjakan</p>
                    </div>
                    <div className="bg-green-500/10 p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{serviceStats.done}</p>
                        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Selesai</p>
                    </div>
                    <div className="bg-emerald-600/10 p-4 rounded-xl text-center">
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">{serviceStats.delivered}</p>
                        <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider">Dikirim</p>
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
                                    {/* Icon Badge */}
                                    <div className="w-[100px] flex-shrink-0">
                                        {tx.type === 'IN' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                                                <ArrowDownLeft className="w-3 h-3" />
                                                Stock In
                                            </span>
                                        ) : tx.type === 'OUT' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 w-fit">
                                                <ArrowUpRight className="w-3 h-3" />
                                                Checkout
                                            </span>
                                        ) : tx.type === 'BOM_ADD' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 w-fit">
                                                <Plus className="w-3 h-3" />
                                                BOM Add
                                            </span>
                                        ) : tx.type === 'Problem' || tx.type === 'Problem Edited' ? (
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border w-fit",
                                                tx.type === 'Problem Edited'
                                                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
                                                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                                            )}>
                                                {tx.type === 'Problem Edited' ? <Edit2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                {tx.type === 'Problem Edited' ? 'Edited' : 'Problem'}
                                            </span>
                                        ) : tx.type === 'Solved' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 w-fit">
                                                <CheckCircle className="w-3 h-3" />
                                                Solved
                                            </span>
                                        ) : tx.type === 'Service Robot' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 w-fit">
                                                <Bot className="w-3 h-3" />
                                                Service
                                            </span>
                                        ) : ['Checked', 'Unchecked'].includes(tx.type) ? (
                                            tx.type === 'Checked' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                                                    <Plus className="w-3 h-3" />
                                                    Checked
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 w-fit">
                                                    <Minus className="w-3 h-3" />
                                                    Unchecked
                                                </span>
                                            )
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 w-fit">
                                                <Minus className="w-3 h-3" />
                                                BOM Rem
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <p className="text-foreground font-medium text-sm">
                                            {tx.product?.name || (['Checked', 'Unchecked'].includes(tx.type)
                                                ? tx.description?.split(' - ')[0]
                                                : ['Problem', 'Solved', 'Problem Edited'].includes(tx.type)
                                                    ? tx.description?.split(' ||| ')[0]
                                                    : 'Unknown Product')}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">
                                            {['Checked', 'Unchecked'].includes(tx.type)
                                                ? (tx.description?.split(' - ').slice(1).join(' - ') || '-')
                                                : ['Problem', 'Solved', 'Problem Edited'].includes(tx.type)
                                                    ? (tx.description?.split(' ||| ')[1] || tx.description)
                                                    : (new Date(tx.createdAt).toLocaleString())}
                                        </p>
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div className="text-right">
                                    {!['Solved', 'Problem', 'Problem Edited', 'Checked', 'Unchecked', 'Service Robot'].includes(tx.type) && (
                                        <span className={cn("font-bold text-sm block",
                                            tx.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' :
                                                tx.type === 'OUT' ? 'text-blue-600 dark:text-blue-400' :
                                                    tx.type === 'BOM_ADD' ? 'text-purple-600 dark:text-purple-400' :
                                                        'text-orange-600 dark:text-orange-400')}>
                                            {['IN', 'BOM_ADD'].includes(tx.type) ? '+' : '-'}{formatNumber(tx.quantity)}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
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
                        <Link href="/pos" className="block w-full py-3 bg-white text-emerald-600 font-bold text-center rounded-xl hover:bg-emerald-50 transition-colors">
                            Go to POS
                        </Link>
                    </div>
                </div>


            </div>
        </div>
    )
}
