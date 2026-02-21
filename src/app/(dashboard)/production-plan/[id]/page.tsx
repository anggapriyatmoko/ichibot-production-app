import prisma from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import UnitRow from './components/unit-row'
import UnitCardMobile from './components/unit-card-mobile'
import IssueAnalysisTable from './components/issue-analysis-table'
import AI_SparepartAnalysis from './components/ai-sparepart-analysis'

export const dynamic = 'force-dynamic'

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const plan = await prisma.productionPlan.findUnique({
        where: { id },
        include: {
            recipe: {
                include: {
                    sections: {
                        orderBy: { createdAt: 'asc' }
                    },
                    ingredients: {
                        include: {
                            product: true
                        }
                    }
                }
            },
            units: {
                orderBy: { unitNumber: 'asc' },
                include: { issues: true }
            }
        }
    })

    if (!plan) return notFound()

    // Check if this plan is for the current month
    const now = new Date()
    const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed
    const currentYear = now.getFullYear()
    const isCurrentMonth = plan.month === currentMonth && plan.year === currentYear

    // Use live sections for current month, snapshot for previous months
    let sections = isCurrentMonth
        ? (plan as any).recipe.sections  // Dynamic for current month
        : (plan as any).recipe.sections  // Default

    const liveSections = (plan as any).recipe.sections // Keep reference to live sections

    // For previous months, try to use snapshot if available
    if (!isCurrentMonth) {
        try {
            if (plan.sectionsSnapshot && plan.sectionsSnapshot !== "[]") {
                sections = JSON.parse(plan.sectionsSnapshot)
            }
        } catch (e) {
            console.error("Failed to parse sectionsSnapshot", e)
            // Fallback to live sections if snapshot parsing fails
        }
    }

    // Helper to generate stable pastel colors
    const getCategoryColor = (category?: string | null) => {
        if (!category) return 'bg-slate-50'
        const colors = [
            'bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-yellow-50', 'bg-lime-50',
            'bg-green-50', 'bg-emerald-50', 'bg-teal-50', 'bg-cyan-50', 'bg-sky-50',
            'bg-blue-50', 'bg-indigo-50', 'bg-violet-50', 'bg-purple-50', 'bg-fuchsia-50',
            'bg-pink-50', 'bg-rose-50'
        ]
        let hash = 0
        for (let i = 0; i < category.length; i++) {
            hash = category.charCodeAt(i) + ((hash << 5) - hash)
        }
        return colors[Math.abs(hash) % colors.length]
    }

    // Create a map of ID/Name to Category from live sections
    const categoryMap = new Map<string, string>()
    liveSections.forEach((s: any) => {
        if (s.category) {
            categoryMap.set(s.id, s.category)
            categoryMap.set(s.name, s.category) // Fallback by name if ID mismatch in snapshot
        }
    })

    // Enhance sections with color, trying to find category if missing
    const sectionsWithColors = sections.map((s: any) => {
        const category = s.category || categoryMap.get(s.id) || categoryMap.get(s.name)
        return {
            ...s,
            category, // Ensure category is attached for display
            colorClass: getCategoryColor(category)
        }
    })

    // Sort: Group by Category first, then by Order
    sectionsWithColors.sort((a: any, b: any) => {
        // Treat null/undefined category as 'zzzz' to put them at the end
        const catA = a.category || 'zzzz'
        const catB = b.category || 'zzzz'

        if (catA !== catB) {
            return catA.localeCompare(catB)
        }
        // Maintain original order within category
        return (a.order || 0) - (b.order || 0)
    })

    return (
        <div className="space-y-8">
            <div className="mb-6">
                <Link href={`/production-plan?month=${plan.month}&year=${plan.year}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Production Plan
                </Link>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">{(plan as any).recipe.name}</h1>
                        <p className="text-muted-foreground">
                            Production Plan for {new Date(0, plan.month - 1).toLocaleString('default', { month: 'long' })} {plan.year} • {plan.quantity} Units
                        </p>
                    </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-muted/50 text-foreground uppercase font-normal text-xs">
                        <tr>
                            <th className="p-[3px] w-[45px] min-w-[45px] text-center shadow-[inset_-1px_-1px_0_0_#E5E7EB] sticky left-0 bg-muted z-30 text-[10px]">
                                No
                            </th>
                            <th className="p-[3px] w-[100px] min-w-[100px] shadow-[inset_-1px_-1px_0_0_#E5E7EB] sticky left-[45px] bg-muted z-30 text-[10px]">
                                Serial
                            </th>
                            <th className="p-[3px] w-[100px] min-w-[100px] shadow-[inset_-1px_-1px_0_0_#E5E7EB] sticky left-[145px] bg-muted z-30 text-[10px]">
                                ID
                            </th>
                            {sectionsWithColors.map((section: any) => (
                                <th key={section.id} className={`p-[3px] border-b border-border w-[80px] min-w-[80px] max-w-[80px] text-center text-[10px] whitespace-normal leading-[1.1] align-middle ${section.colorClass}`}>
                                    <span className="font-bold block w-full">{section.name}</span>
                                    {section.category && <span className="block text-[9px] font-normal opacity-70 mt-0.5">{section.category}</span>}
                                </th>
                            ))}
                            {/* Sales & Packing Columns */}
                            <th className="px-2 py-2 w-20 text-center border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 border-l z-10 text-[10px]">
                                Assembled
                            </th>
                            <th className="px-2 py-2 w-20 text-center border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 z-10 text-[10px]">
                                Link QC
                            </th>
                            <th className="px-2 py-2 w-20 text-center border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 z-10 text-[10px]">
                                Packed
                            </th>
                            <th className="px-2 py-2 w-32 border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 z-10 text-[10px]">
                                Sold
                            </th>
                            <th className="px-2 py-2 w-32 border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 z-10 text-[10px]">
                                Marketplace
                            </th>
                            <th className="px-2 py-2 w-32 border-b border-indigo-200 bg-indigo-50/80 text-indigo-900 z-10 text-[10px]">
                                Customer
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {(plan as any).units.map((unit: any) => (
                            <UnitRow
                                key={unit.id}
                                unit={unit}
                                items={sectionsWithColors}
                                recipeProductionId={(plan as any).recipe.productionId}
                                year={(plan as any).year}
                                month={(plan as any).month}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {(plan as any).units.map((unit: any) => (
                    <UnitCardMobile
                        key={unit.id}
                        unit={unit}
                        sections={sectionsWithColors}
                    />
                ))}
            </div>

            <IssueAnalysisTable units={(plan as any).units} />

            <AI_SparepartAnalysis
                ingredients={(plan as any).recipe.ingredients}
                units={(plan as any).units}
                totalPlanQuantity={plan.quantity}
            />
        </div>
    )
}
