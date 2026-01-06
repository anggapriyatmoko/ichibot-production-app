import prisma from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import UnitRow from './components/unit-row'
import UnitCardMobile from './components/unit-card-mobile'
import IssueAnalysisTable from './components/issue-analysis-table'

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

    // Use sections snapshot if available, otherwise fallback to live sections (backward compatibility)
    // Use sections snapshot if available, otherwise fallback to live sections (backward compatibility)
    let sections = (plan as any).recipe.sections
    try {
        if (plan.sectionsSnapshot && plan.sectionsSnapshot !== "[]") {
            sections = JSON.parse(plan.sectionsSnapshot)
        }
    } catch (e) {
        console.error("Failed to parse sectionsSnapshot", e)
    }

    return (
        <div className="max-w-[1600px] mx-auto">
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
                    <thead className="bg-muted/50 text-foreground uppercase font-medium text-xs">
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
                            {sections.map((section: any) => (
                                <th key={section.id} className="p-[3px] border-b border-border w-[80px] min-w-[80px] max-w-[80px] text-center text-[10px] whitespace-normal leading-[1.1] align-middle">
                                    <span className="font-bold block w-full">{section.name}</span>
                                </th>
                            ))}
                            {/* Sales & Packing Columns */}
                            <th className="px-2 py-2 w-20 text-center border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 border-l z-10 text-[10px]">
                                Assembled
                            </th>
                            <th className="px-2 py-2 w-20 text-center border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 z-10 text-[10px]">
                                Packing
                            </th>
                            <th className="px-2 py-2 w-20 text-center border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 z-10 text-[10px]">
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
                                items={sections}
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
                        sections={sections}
                    />
                ))}
            </div>

            <IssueAnalysisTable units={(plan as any).units} />
        </div>
    )
}
