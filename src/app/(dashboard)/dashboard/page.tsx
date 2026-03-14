import prisma from '@/lib/prisma'
import { Package, AlertTriangle, ArrowUpRight, ArrowDownLeft, Clock, Calendar, History, Plus, Minus, CheckCircle, Edit2, Bot, Wrench, User } from 'lucide-react'
import { formatNumber } from '@/utils/format'
import { cn } from '@/lib/utils'
import ProductionOverviewTable from './components/production-overview-table'
import MonthYearSelector from './components/month-year-selector'
import PendingItemsCard from './components/pending-items-card'
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

                if (!itemPlan) return { month, plan: 0, done: 0, sold: 0 }

                const totalSections = recipe.sections.length
                const doneCount = itemPlan.units.filter(u => !!u.assembledAt).length
                const soldCount = itemPlan.units.filter(u => !!u.isSold).length

                return {
                    month,
                    plan: itemPlan.quantity,
                    done: doneCount, // "Done" means assembled -> all ingredients checked
                    sold: soldCount
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

    // Fetch detailed PENDING & IN_PROGRESS service robots
    const [pendingRobots, inProgressRobots] = await Promise.all([
        prisma.serviceRobot.findMany({
            where: { serviceStatus: 'PENDING' },
            orderBy: { entryDate: 'desc' }
        }),
        prisma.serviceRobot.findMany({
            where: { serviceStatus: 'IN_PROGRESS' },
            orderBy: { entryDate: 'desc' }
        })
    ])

    // Robot Ready Stock
    const readyStockUnits = await prisma.productionUnit.findMany({
        where: {
            isSold: false,
            assembledAt: { not: null }
        },
        include: {
            productionPlan: {
                include: {
                    recipe: true
                }
            }
        },
        orderBy: {
            assembledAt: 'desc'
        }
    })

    const readyStockGrouped = readyStockUnits.reduce((acc: any, unit: any) => {
        const recipeName = unit.productionPlan.recipe.name
        if (!acc[recipeName]) acc[recipeName] = []
        acc[recipeName].push(unit)
        return acc
    }, {})


    return (
        <div className="space-y-8">
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
                            {new Date(selectedLastYear, selectedLastMonth - 1).toLocaleString('default', { month: 'long' })} {selectedLastYear}
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

            {/* Permintaan Barang (Belum Diorder) - Client Component */}
            <PendingItemsCard />


            {/* Robot Ready Stock */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Robot Ready Stock
                    </h3>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg">
                        {Object.values(readyStockGrouped).reduce((acc: number, units: any) => acc + units.length, 0)} Total
                    </span>
                </div>
                {Object.keys(readyStockGrouped).length === 0 ? (
                    <div className="text-center text-muted-foreground p-6 text-sm">No robots are currently ready in stock.</div>
                ) : (
                    <div className="divide-y divide-border">
                        {Object.entries(readyStockGrouped).map(([recipeName, units]: [string, any]) => (
                            <div key={recipeName} className="px-5 py-3">
                                <div className="flex items-center gap-2 mb-2.5">
                                    <span className="text-sm font-semibold text-foreground">{recipeName}</span>
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">{units.length} Pcs</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {units.map((unit: any) => {
                                        const computedSerial = `${unit.productionPlan.recipe.productionId}${unit.productionPlan.year}${unit.productionPlan.month.toString().padStart(2, '0')}${unit.unitNumber.toString().padStart(3, '0')}`
                                        return (
                                            <Link
                                                key={unit.id}
                                                href={`/production-plan/${unit.productionPlan.id}`}
                                                className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all hover:shadow-sm ${unit.isPacked
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 dark:hover:border-blue-400'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 dark:hover:border-emerald-400'
                                                    }`}
                                            >
                                                {unit.productIdentifier || computedSerial}
                                                {unit.isPacked && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="px-5 py-2.5 border-t border-border bg-muted/20 flex gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Assembled</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Packed</span>
                </div>
            </div>

            {/* Service Robot Stats */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        Service Robot
                    </h3>
                    <Link href="/service-robot" className="text-xs text-primary hover:text-blue-500 font-medium">Lihat Semua</Link>
                </div>
                <div className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-muted/30 p-3 rounded-xl text-center">
                            <p className="text-2xl font-bold text-foreground">{serviceStats.total}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Total</p>
                        </div>
                        <div className="bg-red-500/10 p-3 rounded-xl text-center">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{serviceStats.pending}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Masuk</p>
                        </div>
                        <div className="bg-blue-500/10 p-3 rounded-xl text-center">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{serviceStats.inProgress}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Dikerjakan</p>
                        </div>
                        <div className="bg-green-500/10 p-3 rounded-xl text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{serviceStats.done}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Selesai</p>
                        </div>
                        <div className="bg-emerald-600/10 p-3 rounded-xl text-center">
                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">{serviceStats.delivered}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">Dikirim</p>
                        </div>
                    </div>
                </div>

                {/* Detail: Masuk & Dikerjakan */}
                {(pendingRobots.length > 0 || inProgressRobots.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border">
                        {/* Masuk (Pending) */}
                        <div className={cn("border-b md:border-b-0", inProgressRobots.length > 0 && "md:border-r border-border")}>
                            <div className="px-4 py-2.5 bg-red-500/5 border-b border-border flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Masuk</span>
                                <span className="text-[10px] text-muted-foreground">({pendingRobots.length})</span>
                            </div>
                            {pendingRobots.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-muted-foreground">Tidak ada robot masuk</div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {pendingRobots.map((robot: any) => (
                                        <Link key={robot.id} href="/service-robot" className="px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors group">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Bot className="w-4 h-4 text-red-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{robot.robotType}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <p className="text-[11px] text-muted-foreground truncate">{robot.customerName}</p>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 italic">{robot.complaint}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{new Date(robot.entryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Dikerjakan (In Progress) */}
                        <div>
                            <div className="px-4 py-2.5 bg-blue-500/5 border-b border-border flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Dikerjakan</span>
                                <span className="text-[10px] text-muted-foreground">({inProgressRobots.length})</span>
                            </div>
                            {inProgressRobots.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-muted-foreground">Tidak ada robot dikerjakan</div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {inProgressRobots.map((robot: any) => (
                                        <Link key={robot.id} href="/service-robot" className="px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors group">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Wrench className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{robot.robotType}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <User className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <p className="text-[11px] text-muted-foreground truncate">{robot.customerName}</p>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 italic">{robot.complaint}</p>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{new Date(robot.entryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>



        </div>
    )
}
