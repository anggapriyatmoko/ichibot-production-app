import React from 'react'
import prisma from '@/lib/prisma'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import ProductionPlanModal from './components/add-plan-modal'
import AnalysisTable from './components/analysis-table'
import PlanTargetEdit from './components/plan-target-edit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import ImportPlanModal from './components/import-plan-modal'
import { ExportButton } from './components/export-button'
import DeletePlanButton from './components/delete-plan-button'

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
                    category: true,
                    sections: {
                        select: { id: true, createdAt: true }
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
            totalRequired: number
            consumedCount: number
        }
    }

    const demandMap: SparepartDemand = {}
    let analysisData: any[] = []

    if (showAnalysis) {
        // Calculate This Month Demand WITH progress consideration
        productionPlans.forEach(plan => {
            const recipe = currentRecipeMap.get(plan.recipeId)
            if (recipe) {
                recipe.ingredients.forEach((ing: any) => {
                    // Total needed for this plan (all units)
                    const totalForPlan = ing.quantity * plan.units.length

                    // Calculate consumed based on unit progress
                    let consumedForPlan = 0
                    plan.units.forEach((unit: any) => {
                        if (ing.sectionId) {
                            try {
                                const completedSections = JSON.parse(unit.completed || '[]') as string[]
                                if (completedSections.includes(ing.sectionId)) {
                                    consumedForPlan += ing.quantity
                                }
                            } catch (e) {
                                // ignore parse error
                            }
                        }
                    })

                    if (!demandMap[ing.productId]) {
                        demandMap[ing.productId] = {
                            product: ing.product,
                            totalRequired: 0,
                            consumedCount: 0
                        }
                    }
                    demandMap[ing.productId].totalRequired += totalForPlan
                    demandMap[ing.productId].consumedCount += consumedForPlan
                })
            }
        })

        // Transform to Array
        analysisData = Object.values(demandMap).map(item => {
            const remainingNeeded = item.totalRequired - item.consumedCount
            const balance = item.product.stock - remainingNeeded
            return {
                id: item.product.id,
                name: item.product.name,
                stock: item.product.stock,
                neededThisMonth: remainingNeeded, // Now shows remaining, not total
                totalNeeded: remainingNeeded,
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
            <div className="mb-8 text-right md:text-left">
                <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Production Plan</h1>
                <p className="text-muted-foreground">Manage production schedule and track progress.</p>
            </div>

            {/* Filters and Action Buttons */}
            <div className="mb-6">
                {/* Filters Row */}
                <form className="flex gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">Month</label>
                        <select
                            name="month"
                            defaultValue={currentMonth}
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

                {/* Action Buttons Row */}
                {['ADMIN', 'HRD'].includes(session?.user?.role) && (
                    <div className="flex gap-3">
                        <ImportPlanModal month={currentMonth} year={currentYear} />
                        <ExportButton month={currentMonth} year={currentYear} />
                        <ProductionPlanModal
                            recipes={availableRecipes}
                            month={currentMonth}
                            year={currentYear}
                        />
                    </div>
                )}
            </div>

            {/* Production Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-foreground uppercase font-normal">
                            <tr>
                                <th className="px-6 py-4">Product Name & Progress</th>
                                <th className="px-6 py-4 text-center">Target</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {(() => {
                                // Group plans by category name
                                const groupedPlans: Record<string, typeof productionPlans> = {}
                                productionPlans.forEach((plan: any) => {
                                    const categoryName = plan.recipe.category?.name || 'Uncategorized'
                                    if (!groupedPlans[categoryName]) {
                                        groupedPlans[categoryName] = []
                                    }
                                    groupedPlans[categoryName].push(plan)
                                })

                                // Sort category names alphabetically
                                const sortedCategories = Object.keys(groupedPlans).sort()

                                return sortedCategories.map((categoryName) => {
                                    return (
                                        <React.Fragment key={categoryName}>
                                            {/* Category Header */}
                                            <tr key={`cat-${categoryName}`} className="bg-blue-100 border-l-4 border-blue-500 border-t border-b">
                                                <td colSpan={3} className="px-6 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                        </svg>
                                                        <span className="font-semibold text-blue-700 text-sm">{categoryName}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Plans in this category */}
                                            {groupedPlans[categoryName].map((plan: any) => {
                                                return (
                                                    <tr key={plan.id} className="hover:bg-accent/50 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="mb-2">
                                                                <span className="font-medium text-foreground">{plan.recipe.name}</span>
                                                            </div>

                                                            {/* Unit Progress List */}
                                                            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                                                                {(plan as any).units.map((unit: any) => {
                                                                    // Check if this plan is for the current month
                                                                    const now = new Date()
                                                                    const currentMonthNow = now.getMonth() + 1
                                                                    const currentYearNow = now.getFullYear()
                                                                    const isCurrentMonth = plan.month === currentMonthNow && plan.year === currentYearNow

                                                                    // Use live sections for current month, snapshot for previous months
                                                                    // If snapshot is missing (legacy plans), filter live sections by plan creation date
                                                                    const sections = isCurrentMonth
                                                                        ? plan.recipe.sections
                                                                        : (plan.sectionsSnapshot && plan.sectionsSnapshot !== "[]"
                                                                            ? JSON.parse(plan.sectionsSnapshot)
                                                                            : plan.recipe.sections.filter((s: any) => new Date(s.createdAt) <= new Date(plan.createdAt)))

                                                                    const validSectionIds = new Set(sections.map((s: any) => s.id))
                                                                    const completedIds = JSON.parse(unit.completed || '[]')

                                                                    // Only count IDs that are valid sections for this recipe
                                                                    const validCompletedCount = completedIds.filter((id: string) => validSectionIds.has(id)).length

                                                                    const totalSections = sections.length

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

                                                                    // Compute Serial using same logic as UnitRow
                                                                    const computedSerial = `${plan.recipe.productionId}${plan.year}${plan.month.toString().padStart(2, '0')}${unit.unitNumber.toString().padStart(3, '0')}`

                                                                    return (
                                                                        <div key={unit.id} className={`flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded border ${colorClass}`}>
                                                                            <span className="flex items-center flex-wrap gap-1">
                                                                                {unit.unitNumber}. {unit.productIdentifier || computedSerial}
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
                                                                {['ADMIN', 'HRD'].includes(session?.user?.role) && (
                                                                    <DeletePlanButton id={plan.id} name={plan.recipe.name} />
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </React.Fragment>
                                    )
                                })
                            })()}
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
            </div>

            {/* Analysis Table */}
            {showAnalysis && <AnalysisTable data={analysisData} />}
        </div>
    )
}
