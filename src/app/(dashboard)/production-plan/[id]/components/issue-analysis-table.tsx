'use client'

import { useState } from 'react'
import { AlertTriangle, Bot, BrainCircuit, Sparkles, CheckCircle, Edit2, Plus } from 'lucide-react'
import IssueModal from './issue-modal'

interface Issue {
    id: string
    description: string
    resolution?: string | null
    isResolved: boolean
    createdAt: Date
}

interface Unit {
    id: string
    unitNumber: number
    productIdentifier: string | null
    customId: string | null
    issues: Issue[]
}

interface IssueAnalysisTableProps {
    units: Unit[]
}

export default function IssueAnalysisTable({ units }: IssueAnalysisTableProps) {
    // Show all units that have any issues (resolved or not)
    const unitsWithIssues = units.filter(u => u.issues?.length > 0)
    const activeAnomalies = units.filter(u => u.issues?.some(i => !i.isResolved)).length

    // State for managing modal from this table
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
    const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
    const [resolveMode, setResolveMode] = useState(false)

    const handleManageIssue = (unit: Unit, issue: Issue, isResolve: boolean) => {
        setSelectedUnit(unit)
        setSelectedIssue(issue)
        setResolveMode(isResolve)
    }

    const handleAddNewIssue = (unit: Unit) => {
        setSelectedUnit(unit)
        setSelectedIssue(null) // null means creating new issue
        setResolveMode(false)
    }

    if (unitsWithIssues.length === 0) {
        return (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm text-slate-600">
                                <BrainCircuit className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                    Neural Detection
                                </h2>
                                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    No anomalies recorded
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-normal tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Unit Identity</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Detected Anomaly</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                            <p className="font-medium text-slate-600">No anomalies detected</p>
                                            <p className="text-xs text-slate-400">All units are running within normal parameters.</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <p className="font-medium text-slate-600">No anomalies detected</p>
                            <p className="text-xs text-slate-400">All units are running within normal parameters.</p>
                        </div>
                    </div>
                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-2">
                        <Bot className="w-3 h-3" />
                        <span>Automated anomaly tracking active. Efficiency impact calculated based on resolution time.</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Header - Sleek Light */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-sm text-slate-600">
                            <BrainCircuit className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                Neural Detection
                            </h2>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                {activeAnomalies > 0
                                    ? `${activeAnomalies} active anomalies detected`
                                    : 'All anomalies resolved'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-normal tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Unit Identity</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Detected Anomaly</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {unitsWithIssues.map((unit) => {
                                // Get the most recent issue (could be resolved or not)
                                const sortedIssues = [...unit.issues].sort((a, b) =>
                                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                )
                                // Prioritize active issues, then show resolved
                                const activeIssue = sortedIssues.find(i => !i.isResolved)
                                const latestIssue = activeIssue || sortedIssues[0]
                                const isResolved = latestIssue.isResolved

                                return (
                                    <tr key={unit.id} className={`group transition-colors ${isResolved ? 'bg-green-50/30 hover:bg-green-50/50' : 'hover:bg-slate-50/80'}`}>
                                        <td className="px-6 py-4 align-top w-48">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs shadow-sm ${isResolved
                                                    ? 'bg-green-50 text-green-600 border-green-100'
                                                    : 'bg-red-50 text-red-600 border-red-100'
                                                    }`}>
                                                    #{unit.unitNumber}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">
                                                        {unit.productIdentifier || 'No Serial'}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono">
                                                        {unit.customId || 'No ID'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top w-28">
                                            {isResolved ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Solved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 align-top w-32 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`font-medium ${isResolved ? 'text-green-700' : 'text-slate-700'}`}>
                                                    {new Date(latestIssue.createdAt).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(latestIssue.createdAt).toLocaleTimeString('id-ID', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="space-y-3">
                                                {/* Show active issues first */}
                                                {sortedIssues.filter(i => !i.isResolved).map((issue) => (
                                                    <div key={issue.id} className="flex items-start gap-3 p-2 bg-red-50/50 rounded-lg border border-red-100">
                                                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="leading-relaxed text-sm whitespace-pre-wrap break-words text-slate-700">
                                                                {issue.description}
                                                            </p>
                                                            <div className="text-[10px] text-slate-400 mt-1">
                                                                {new Date(issue.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(issue.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {/* Show resolved issues below */}
                                                {sortedIssues.filter(i => i.isResolved).map((issue) => (
                                                    <div key={issue.id} className="flex items-start gap-3 p-2 bg-green-50/50 rounded-lg border border-green-100 opacity-70">
                                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="leading-relaxed text-sm whitespace-pre-wrap break-words text-green-700">
                                                                {issue.description}
                                                            </p>
                                                            {issue.resolution && (
                                                                <div className="mt-1 p-1.5 bg-green-100/50 rounded-md border border-green-100">
                                                                    <p className="text-xs text-green-800 flex gap-1.5">
                                                                        <span className="shrink-0 pt-0.5">✅</span>
                                                                        <span className="whitespace-pre-wrap">{issue.resolution}</span>
                                                                    </p>
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Solved • {new Date(issue.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(issue.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right align-top w-48">
                                            {isResolved ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAddNewIssue(unit)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-95"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Add New Issue
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleManageIssue(unit, latestIssue, true)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 shadow-sm hover:bg-green-100 hover:border-green-300 transition-all active:scale-95"
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        Solved
                                                    </button>
                                                    <button
                                                        onClick={() => handleManageIssue(unit, latestIssue, false)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {unitsWithIssues.map((unit) => {
                        const sortedIssues = [...unit.issues].sort((a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        )
                        const activeIssue = sortedIssues.find(i => !i.isResolved)
                        const latestIssue = activeIssue || sortedIssues[0]
                        const isResolved = latestIssue.isResolved

                        return (
                            <div key={unit.id} className={`p-4 transition-colors ${isResolved ? 'bg-green-50/30' : 'hover:bg-slate-50/80'}`}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-sm shadow-sm ${isResolved
                                            ? 'bg-green-50 text-green-600 border-green-100'
                                            : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                            #{unit.unitNumber}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900 text-sm">
                                                {unit.productIdentifier || 'No Serial'}
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono">
                                                {unit.customId || 'No ID'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {isResolved ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                <CheckCircle className="w-3 h-3" />
                                                Solved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                                <AlertTriangle className="w-3 h-3" />
                                                Active
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="text-xs text-slate-500 mb-2">Detected Anomalies</div>
                                    <div className="space-y-2">
                                        {/* Show active issues first */}
                                        {sortedIssues.filter(i => !i.isResolved).map((issue) => (
                                            <div key={issue.id} className="flex items-start gap-2 p-2 bg-red-50/50 rounded-lg border border-red-100">
                                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-slate-700">
                                                        {issue.description}
                                                    </p>
                                                    <div className="text-[10px] text-slate-400 mt-1">
                                                        {new Date(issue.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(issue.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Show resolved issues below */}
                                        {sortedIssues.filter(i => i.isResolved).map((issue) => (
                                            <div key={issue.id} className="flex items-start gap-2 p-2 bg-green-50/50 rounded-lg border border-green-100 opacity-70">
                                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-green-700">
                                                        {issue.description}
                                                    </p>
                                                    {issue.resolution && (
                                                        <div className="mt-1 p-1.5 bg-green-100/50 rounded-md border border-green-100">
                                                            <p className="text-xs text-green-800 flex gap-1.5">
                                                                <span className="shrink-0 pt-0.5">✅</span>
                                                                <span className="whitespace-pre-wrap">{issue.resolution}</span>
                                                            </p>
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Solved • {new Date(issue.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(issue.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {isResolved ? (
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => handleAddNewIssue(unit)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-100 hover:border-amber-300 transition-all active:scale-95"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            Add New Issue
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={() => handleManageIssue(unit, latestIssue, true)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700 shadow-sm hover:bg-green-100 hover:border-green-300 transition-all active:scale-95"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            Solved
                                        </button>
                                        <button
                                            onClick={() => handleManageIssue(unit, latestIssue, false)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Edit
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Footer Insight */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-2">
                    <Bot className="w-3 h-3" />
                    <span>Automated anomaly tracking active. Efficiency impact calculated based on resolution time.</span>
                </div>
            </div>

            {/* Re-use the existing modal for management */}
            {selectedUnit && (
                <IssueModal
                    isOpen={!!selectedUnit}
                    onClose={() => {
                        setSelectedUnit(null)
                        setSelectedIssue(null)
                    }}
                    unitId={selectedUnit.id}
                    unitNumber={selectedUnit.unitNumber}
                    existingIssue={selectedIssue}
                    initialResolveMode={resolveMode}
                />
            )}
        </div>
    )
}

