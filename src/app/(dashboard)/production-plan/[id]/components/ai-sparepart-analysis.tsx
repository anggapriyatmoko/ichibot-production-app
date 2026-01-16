'use client'

import { useState } from 'react'
import { Bot, Microchip, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Ingredient {
    id: string
    quantity: number
    sectionId: string | null
    product: {
        id: string
        name: string
        sku: string | null
        stock: number
    }
}

interface Unit {
    id: string
    completed: string // JSON string of completed section IDs
}

interface AISparepartAnalysisProps {
    ingredients: Ingredient[]
    units: Unit[]
    totalPlanQuantity: number
}

export default function AISparepartAnalysis({ ingredients, units, totalPlanQuantity }: AISparepartAnalysisProps) {
    // 1. Calculate Metrics
    const analysis = ingredients.map(ing => {
        // Total needed for the entire plan
        const totalRequired = ing.quantity * units.length

        // Calculate consumed based on unit progress
        // A part is consumed if the unit has completed the section this part belongs to
        // If part has no section (uncategorized), we might assume it's consumed when unit is assembled? 
        // For now, let's assume uncategorized parts are 'General' matches or assume linked to Main section behavior if defined.
        // Or strictly: if sectionId is null, it's not tracked by section toggles -> maybe untracked or always 0 consumed until end?
        // Let's stick to: Count usage if sectionId is in completed list.

        let consumedCount = 0
        units.forEach(unit => {
            if (ing.sectionId) {
                try {
                    const completedSections = JSON.parse(unit.completed || '[]') as string[]
                    if (completedSections.includes(ing.sectionId)) {
                        consumedCount += ing.quantity
                    }
                } catch (e) {
                    // ignore parse error
                }
            }
        })

        const remainingNeeded = totalRequired - consumedCount
        const percentConsumed = totalRequired > 0 ? (consumedCount / totalRequired) * 100 : 0

        // Stock projection
        const currentStock = ing.product.stock
        const projectedStock = currentStock - remainingNeeded
        const isShortage = projectedStock < 0

        return {
            ...ing,
            totalRequired,
            consumedCount,
            remainingNeeded,
            percentConsumed,
            currentStock,
            projectedStock,
            isShortage
        }
    })

    // Sort: Shortages first, then by highest remaining needed
    const sortedAnalysis = [...analysis].sort((a, b) => {
        if (a.isShortage && !b.isShortage) return -1
        if (!a.isShortage && b.isShortage) return 1
        return b.remainingNeeded - a.remainingNeeded
    })

    const filteredAnalysis = sortedAnalysis

    const totalShortages = analysis.filter(i => i.isShortage).length
    const progress = analysis.reduce((acc, curr) => acc + curr.percentConsumed, 0) / (analysis.length || 1)

    return (
        <div className="hidden md:block mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-indigo-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white to-indigo-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm text-indigo-600">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                AI Sparepart Analysis
                            </h2>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <Microchip className="w-3.5 h-3.5" />
                                Real-time inventory consumption tracking
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {totalShortages > 0 && (
                            <div className="px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-red-700 animate-pulse">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-xs font-bold">{totalShortages} Potential Shortages</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 text-xs uppercase text-slate-500 font-normal tracking-wider">
                            <tr>
                                <th className="px-6 py-4 pl-6">Part Details</th>
                                <th className="px-6 py-4 text-center">Required</th>
                                <th className="px-6 py-4 text-center">Consumed</th>
                                <th className="px-6 py-4 text-center">Remaining</th>
                                <th className="px-6 py-4 text-center">Stock Now</th>
                                <th className="px-6 py-4">Stock Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAnalysis.length === 0 ? (
                                <tr >
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <Package className="w-10 h-10 opacity-20" />
                                            <p>No parts found for this criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAnalysis.map((item) => (
                                    <tr key={item.product.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                    {item.product.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    SKU: {item.product.sku || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-medium text-slate-600">{item.totalRequired.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="font-bold text-indigo-600">{item.consumedCount.toLocaleString()}</span>
                                                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.min(item.percentConsumed, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-bold ${item.remainingNeeded === 0 ? 'text-green-500' : 'text-slate-700'}`}>
                                                {item.remainingNeeded.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-medium text-slate-700">
                                                {item.currentStock.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.remainingNeeded === 0 ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs border border-green-100">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Detailed Completed
                                                </div>
                                            ) : item.isShortage ? (
                                                <div className="flex flex-col gap-1">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-100">
                                                        <TrendingDown className="w-3.5 h-3.5" />
                                                        Shortage: {Math.abs(item.projectedStock).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 pl-1">
                                                        Current Stock: {item.currentStock}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs border border-emerald-100">
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                        Sufficient
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 pl-1">
                                                        Projected End: {item.projectedStock.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bot className="w-3 h-3" />
                        <span>Consumption calculated based on completed sections in real-time.</span>
                    </div>
                    <div>
                        Total Progress: {Math.round(progress)}%
                    </div>
                </div>
            </div>
        </div >
    )
}
