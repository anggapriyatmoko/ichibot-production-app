import prisma from '@/lib/prisma'
import { Calendar, Plus, Trash2, Eye } from 'lucide-react'
import { createProductionPlan, deleteProductionPlan } from '@/app/actions/production-plan'
import Link from 'next/link'
import ProductionPlanModal from './components/add-plan-modal'
import AnalysisTable from './components/analysis-table'
import PlanTargetEdit from './components/plan-target-edit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import ImportPlanModal from './components/import-plan-modal'
import { ExportButton } from './components/export-button'

export const dynamic = 'force-dynamic'

export default async function ProductionPlanPage({
    searchParams,
}: {
    searchParams: Promise<{ month?: string; year?: string }>
}) {
    const today = new Date()
    const sp = await searchParams
    const session: any = await getServerSession(authOptions)
    const currentMonth = sp.month ? parseInt(sp.month) : today.getMonth() + 1
    const currentYear = sp.year ? parseInt(sp.year) : today.getFullYear()

    // Fetch recipes for the add form
    const recipes = await prisma.recipe.findMany({
        orderBy: { name: 'asc' },
        include: {
            _count: { select: { sections: true } }
        }
    })

    // Fetch production plans for selected period
    const productionPlans = await prisma.productionPlan.findMany({
        where: {
            month: currentMonth,
            year: currentYear
        },
        include: {
            recipe: {
                include: {
                    sections: {
                        select: { id: true }
                    }
                }
            },
            units: {
                orderBy: { unitNumber: 'asc' }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })



    // Also need ingredients for current month plans to calculate demand
    // (Optimization: We could have included ingredients in the main query, 
    // but the main query is tailored for UI display with sections. 
    // It might be cleaner to just fetch what we need for analysis or modify the main query.)
    // Let's modify the main query slightly or just fetch ingredients here to be safe and clean.
    // Actually, let's fetch ingredients for the *current plans* separately or include them above.
    // To avoid changing the existing complex main query too much, let's just fetch the relevant recipes with ingredients.
    const currentPlanRecipeIds = productionPlans.map(p => p.recipeId)
    const currentRecipesWithIngredients = await prisma.recipe.findMany({
        where: { id: { in: currentPlanRecipeIds } },
        include: { ingredients: { include: { product: true } } }
    })

    // Map for easy lookup
    const currentRecipeMap = new Map(currentRecipesWithIngredients.map(r => [r.id, r]))

    // --- Analysis Calculation ---
    // Only calculate for current or future months
    const selectedDate = new Date(currentYear, currentMonth - 1, 1)
    const currentDate = new Date(today.getFullYear(), today.getMonth(), 1)
    const showAnalysis = selectedDate.getTime() >= currentDate.getTime()

    interface SparepartDemand {
        [productId: string]: {
            product: any
            neededThisMonth: number
        }
    }

    const demandMap: SparepartDemand = {}
    let analysisData: any[] = []

    if (showAnalysis) {
        // Calculate This Month Demand
        productionPlans.forEach(plan => {
            const recipe = currentRecipeMap.get(plan.recipeId)
            if (recipe) {
                recipe.ingredients.forEach(ing => {
                    const totalNeeded = ing.quantity * plan.quantity
                    if (!demandMap[ing.productId]) {
                        demandMap[ing.productId] = {
                            product: ing.product,
                            neededThisMonth: 0
                        }
                    }
                    demandMap[ing.productId].neededThisMonth += totalNeeded
                })
            }
        })

        // Transform to Array
        analysisData = Object.values(demandMap).map(item => {
            const totalNeeded = item.neededThisMonth
            const balance = item.product.stock - totalNeeded
            return {
                id: item.product.id,
                name: item.product.name,
                stock: item.product.stock,
                neededThisMonth: item.neededThisMonth,
                totalNeeded,
                balance,
                status: (balance >= 0 ? 'SAFE' : 'SHORT') as 'SAFE' | 'SHORT'
            }
        })
    }

    // Filter out recipes that are already planned for this period
    const plannedRecipeIds = new Set(productionPlans.map(p => p.recipeId))
    const availableRecipes = recipes.filter(r => !plannedRecipeIds.has(r.id))

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i)

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Production Plan</h1>
                <p className="text-muted-foreground">Manage production schedule and track progress.</p>
            </div>

            {/* Filters and Add Button */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-end md:items-center">
                <form className="flex gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Month</label>
                        <select
                            name="month"
                            defaultValue={currentMonth}
                            // Auto-submit on change would require client component or JS. 
                            // For simplicity using a button.
                            className="bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
                        <select
                            name="year"
                            defaultValue={currentYear}
                            className="bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary outline-none"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors">
                            Filter
                        </button>
                    </div>
                </form>

                <div className="w-full md:w-auto">
                    {session?.user?.role === 'ADMIN' && (
                        <div className="flex gap-2">
                            <ExportButton month={currentMonth} year={currentYear} />
                            <ImportPlanModal month={currentMonth} year={currentYear} />
                            <ProductionPlanModal
                                recipes={availableRecipes}
                                month={currentMonth}
                                year={currentYear}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Production Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted text-foreground uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4">Product Name & Progress</th>
                            <th className="px-6 py-4 text-center">Target</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {productionPlans.map((plan: any) => {


                            return (
                                <tr key={plan.id} className="hover:bg-accent/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-foreground">{plan.recipe.name}</span>
                                        </div>

                                        {/* Unit Progress List */}
                                        <div className="pl-11 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                                            {(plan as any).units.map((unit: any) => {
                                                const validSectionIds = new Set(plan.recipe.sections.map((s: any) => s.id))
                                                const completedIds = JSON.parse(unit.completed)

                                                // Only count IDs that are valid sections for this recipe
                                                const validCompletedCount = completedIds.filter((id: string) => validSectionIds.has(id)).length

                                                const totalSections = plan.recipe.sections.length

                                                const rawProgress = totalSections > 0
                                                    ? Math.round((validCompletedCount / totalSections) * 100)
                                                    : 0
                                                const progress = Math.min(rawProgress, 100)

                                                // Determine color based on progress (Red -> Orange -> Green)
                                                let colorClass = "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200/20"
                                                if (progress === 100) {
                                                    colorClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/20"
                                                } else if (progress > 30) {
                                                    colorClass = "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200/20"
                                                }

                                                // Status Text Logic
                                                let statusElement = null
                                                if (unit.isSold) {
                                                    statusElement = <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded ml-2">Sold - {unit.customer || 'Unknown'}</span>
                                                } else if (unit.isPacked) {
                                                    statusElement = <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded ml-2">Packed</span>
                                                }

                                                return (
                                                    <div key={unit.id} className={`flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded border ${colorClass}`}>
                                                        <span className="flex items-center flex-wrap gap-1">
                                                            {unit.unitNumber}. {unit.productIdentifier || <span className="opacity-50">No Serial</span>}
                                                            {statusElement}
                                                        </span>
                                                        <span className="font-bold">
                                                            {progress}%
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-lg align-top pt-6">
                                        <PlanTargetEdit id={plan.id} initialQuantity={plan.quantity} userRole={session?.user?.role} />
                                    </td>
                                    <td className="px-6 py-4 text-right align-top pt-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/production-plan/${plan.id}`} className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            {session?.user?.role === 'ADMIN' && (
                                                <form action={async () => {
                                                    'use server'
                                                    await deleteProductionPlan(plan.id)
                                                }}>
                                                    <button type="submit" className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </form>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {productionPlans.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                    No production plans found for this period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Analysis Table */}
            {showAnalysis && <AnalysisTable data={analysisData} />}
        </div>
    )
}
