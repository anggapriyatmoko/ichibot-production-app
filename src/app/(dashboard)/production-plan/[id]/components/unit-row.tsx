'use client'

import { updateUnitIdentifier, updateUnitCustomId, toggleUnitIngredient, updateUnitSalesData, reportIssue, resolveIssue } from '@/app/actions/production-plan'
import { Check, Box, ShoppingBag, AlertTriangle, AlertCircle, Hammer } from 'lucide-react'
import { useState, useTransition, useEffect } from 'react'
import IssueModal from './issue-modal'

interface UnitRowProps {
    unit: any
    items: any[]
}

export default function UnitRow({ unit, items }: UnitRowProps) {
    const [isPending, startTransition] = useTransition()
    const [completedIds, setCompletedIds] = useState<string[]>(JSON.parse(unit.completed))
    const [identifier, setIdentifier] = useState(unit.productIdentifier || '')
    const [customId, setCustomId] = useState(unit.customId || '')

    // Sales Data States
    const [isAssembled, setIsAssembled] = useState(!!unit.assembledAt)
    const [isPacked, setIsPacked] = useState(unit.isPacked)
    const [isSold, setIsSold] = useState(unit.isSold)
    const [marketplace, setMarketplace] = useState(unit.marketplace || '')
    const [customer, setCustomer] = useState(unit.customer || '')

    // Calculate if all sections are checked
    const isAllSectionsChecked = items.length > 0 && items.every(item => completedIds.includes(item.id))

    // Auto-uncheck Assembled, Packed and Sold when production progress is incomplete
    useEffect(() => {
        if (!isAllSectionsChecked) {
            if (isAssembled) {
                setIsAssembled(false)
                handleSalesUpdate('isAssembled', false)
            }
        }
    }, [isAllSectionsChecked])

    useEffect(() => {
        if (!isAssembled) {
            if (isPacked) {
                setIsPacked(false)
                handleSalesUpdate('isPacked', false)
            }
        }
    }, [isAssembled])

    useEffect(() => {
        if (!isPacked) {
            if (isSold) {
                setIsSold(false)
                handleSalesUpdate('isSold', false)
            }
        }
    }, [isPacked])

    // Auto-clear marketplace and customer when Sold is unchecked
    useEffect(() => {
        if (!isSold && (marketplace || customer)) {
            setMarketplace('')
            setCustomer('')
            handleSalesUpdate('marketplace', '')
            handleSalesUpdate('customer', '')
        }
    }, [isSold])

    const handleToggle = (itemId: string) => {
        const isCompleted = completedIds.includes(itemId)
        const newCompletedIds = isCompleted
            ? completedIds.filter(id => id !== itemId)
            : [...completedIds, itemId]

        setCompletedIds(newCompletedIds) // Optimistic update

        startTransition(async () => {
            await toggleUnitIngredient(unit.id, itemId, !isCompleted)
        })
    }

    const handleIdentifierBlur = () => {
        if (identifier !== unit.productIdentifier) {
            startTransition(async () => {
                await updateUnitIdentifier(unit.id, identifier)
            })
        }
    }

    const handleCustomIdBlur = () => {
        if (customId !== unit.customId) {
            startTransition(async () => {
                await updateUnitCustomId(unit.id, customId)
            })
        }
    }

    const handleSalesUpdate = (field: string, value: any) => {
        startTransition(async () => {
            await updateUnitSalesData(unit.id, { [field]: value })
        })
    }

    // Issue Tracking
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
    const activeIssue = unit.issues?.find((i: any) => !i.isResolved)
    const hasIssue = !!activeIssue

    const handleIssueClick = () => {
        setIsIssueModalOpen(true)
    }

    return (
        <>
            <IssueModal
                isOpen={isIssueModalOpen}
                onClose={() => setIsIssueModalOpen(false)}
                unitId={unit.id}
                unitNumber={unit.unitNumber}
                existingIssue={activeIssue}
            />
            <tr className={`transition-colors ${hasIssue ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-accent/30'}`}>
                <td className={`px-2 py-1 text-center border-r border-border font-medium text-muted-foreground sticky left-0 z-20 text-[10px] group-cell relative ${hasIssue ? 'bg-red-50 dark:bg-red-900/10' : 'bg-card group-hover:bg-accent/30'}`}>
                    <div className="flex items-center justify-center gap-1 group/issue h-full w-full">
                        <span>{unit.unitNumber}</span>
                        <button
                            onClick={handleIssueClick}
                            title={hasIssue ? activeIssue.description : "Report Issue"}
                            className={`
                            w-4 h-4 rounded-full flex items-center justify-center transition-all absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30
                            ${hasIssue
                                    ? 'bg-red-500 text-white shadow-sm ring-2 ring-background'
                                    : 'opacity-0 group-hover/issue:opacity-100 bg-yellow-100 hover:bg-yellow-400 text-yellow-700 hover:text-white'
                                }
                        `}
                        >
                            <AlertTriangle className="w-2.5 h-2.5" />
                        </button>
                    </div>
                </td>
                <td className="px-2 py-1 border-r border-border sticky left-12 bg-card z-10 group-hover:bg-accent/30">
                    <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        onBlur={handleIdentifierBlur}
                        placeholder="Serial..."
                        className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-0.5 outline-none text-[10px] font-mono transition-all h-6"
                    />
                </td>
                <td className="px-2 py-1 border-r border-border sticky left-[208px] bg-card z-10 group-hover:bg-accent/30">
                    <input
                        type="text"
                        value={customId}
                        onChange={(e) => setCustomId(e.target.value)}
                        onBlur={handleCustomIdBlur}
                        placeholder="ID..."
                        className="w-full bg-transparent border border-transparent hover:border-border focus:border-primary rounded px-2 py-0.5 outline-none text-[10px] font-mono transition-all h-6 text-left"
                    />
                </td>
                {items.map(item => {
                    const isChecked = completedIds.includes(item.id)
                    return (
                        <td key={item.id} className="px-2 py-1 text-center border-r border-border">
                            <button
                                onClick={() => handleToggle(item.id)}
                                className={`
                                w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 mx-auto
                                ${isChecked
                                        ? 'bg-primary border-primary text-primary-foreground shadow-sm scale-100'
                                        : 'bg-transparent border-gray-300 dark:border-gray-700 hover:border-primary/50 text-transparent scale-90 hover:scale-100'
                                    }
                            `}
                            >
                                <Check className="w-3 h-3" strokeWidth={3} />
                            </button>
                        </td>
                    )
                })}

                {/* Sales & Packing Cells - Distinct Styling */}
                <td className="px-2 py-1 text-center border-r border-indigo-100 bg-indigo-50/30 border-l">
                    <button
                        onClick={() => {
                            if (isAllSectionsChecked) {
                                setIsAssembled(!isAssembled)
                                handleSalesUpdate('isAssembled', !isAssembled)
                            }
                        }}
                        disabled={!isAllSectionsChecked}
                        className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 mx-auto
                        ${isAssembled
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm scale-100'
                                : !isAllSectionsChecked
                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                    : 'bg-white border-indigo-200 hover:border-indigo-400 text-transparent scale-90 hover:scale-100'
                            }
                    `}
                    >
                        <Hammer className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </button>
                </td>
                <td className="px-2 py-1 text-center border-r border-indigo-100 bg-indigo-50/30">
                    <button
                        onClick={() => {
                            if (isAssembled) {
                                setIsPacked(!isPacked)
                                handleSalesUpdate('isPacked', !isPacked)
                            }
                        }}
                        disabled={!isAssembled}
                        className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 mx-auto
                        ${isPacked
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm scale-100'
                                : !isAssembled
                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                    : 'bg-white border-indigo-200 hover:border-indigo-400 text-transparent scale-90 hover:scale-100'
                            }
                    `}
                    >
                        <Box className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </button>
                </td>
                <td className="px-2 py-1 text-center border-r border-indigo-100 bg-indigo-50/30">
                    <button
                        onClick={() => {
                            if (isPacked) {
                                setIsSold(!isSold)
                                handleSalesUpdate('isSold', !isSold)
                            }
                        }}
                        disabled={!isPacked}
                        className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 mx-auto
                        ${isSold
                                ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm scale-100'
                                : !isPacked
                                    ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-50'
                                    : 'bg-white border-indigo-200 hover:border-indigo-400 text-transparent scale-90 hover:scale-100'
                            }
                    `}
                    >
                        <ShoppingBag className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </button>
                </td>
                <td className="px-2 py-1 border-r border-indigo-100 bg-indigo-50/30">
                    <input
                        type="text"
                        value={marketplace}
                        onChange={(e) => setMarketplace(e.target.value)}
                        onBlur={(e) => handleSalesUpdate('marketplace', e.target.value)}
                        placeholder="Tokopedia"
                        className="w-full bg-white/50 border border-indigo-100 hover:border-indigo-300 focus:border-indigo-500 rounded px-2 py-0.5 outline-none text-[10px] text-indigo-900 placeholder:text-indigo-300 transition-all h-6"
                    />
                </td>
                <td className="px-2 py-1 bg-indigo-50/30">
                    <input
                        type="text"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        onBlur={(e) => handleSalesUpdate('customer', e.target.value)}
                        placeholder="Customer Name"
                        className="w-full bg-white/50 border border-indigo-100 hover:border-indigo-300 focus:border-indigo-500 rounded px-2 py-0.5 outline-none text-[10px] text-indigo-900 placeholder:text-indigo-300 transition-all h-6"
                    />
                </td>
            </tr>
        </>
    )
}
