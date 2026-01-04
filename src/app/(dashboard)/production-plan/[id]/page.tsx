import prisma from '@/lib/prisma'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import UnitRow from './components/unit-row'
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

    return (
        <div className="max-w-[1600px] mx-auto">
            <div className="mb-6">
                <Link href="/production-plan" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
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

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-muted/50 text-foreground uppercase font-medium text-xs">
                        <tr>
                            <th className="px-2 py-2 w-12 text-center border-b border-r border-border sticky left-0 bg-muted/50 z-10 text-[10px]">
                                No
                            </th>
                            <th className="px-2 py-2 w-40 border-b border-r border-border sticky left-12 bg-muted/50 z-10 text-[10px]">
                                Serial
                            </th>
                            <th className="px-2 py-2 w-40 border-b border-r border-border sticky left-[208px] bg-muted/50 z-10 text-[10px]">
                                ID
                            </th>
                            {(plan as any).recipe.sections.map((section: any) => (
                                <th key={section.id} className="px-2 py-2 border-b border-border min-w-[100px] text-center text-[10px]">
                                    <span className="font-bold">{section.name}</span>
                                </th>
                            ))}
                            {/* Sales & Packing Columns */}
                            <th className="px-2 py-2 w-20 text-center border-b border-r border-indigo-200 bg-indigo-50/80 text-indigo-900 border-l z-10 text-[10px]">
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
                                items={(plan as any).recipe.sections}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            <IssueAnalysisTable units={(plan as any).units} />
        </div>
    )
}
