'use client'

import { updateUnitIdentifier, updateUnitCustomId, toggleUnitSection, updateUnitSalesData, reportIssue, resolveIssue } from '@/app/actions/production-plan'
import { Check, Box, ShoppingBag, AlertTriangle, AlertCircle, Hammer } from 'lucide-react'
import { useState, useTransition, useEffect } from 'react'
import IssueModal from './issue-modal'
import ConfirmModal from './confirm-modal'

interface UnitRowProps {
    unit: any
    items: any[]
    recipeProductionId: string
    year: number
    month: number
}

export default function UnitRow({ unit, items, recipeProductionId, year, month }: UnitRowProps) {
    const [isPending, startTransition] = useTransition()
    const [completedIds, setCompletedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(unit.completed || '[]')
        } catch {
            return []
        }
    })
    // const [identifier, setIdentifier] = useState(unit.productIdentifier || '') // Handled by computed serial

    // Compute Serial: ProdID + Year + Month(2) + Unit(3)
    const computedSerial = `${recipeProductionId}${year.toString()}${month.toString().padStart(2, '0')}${unit.unitNumber.toString().padStart(3, '0')}`

    const [customId, setCustomId] = useState(unit.customId || '')

    // Sales Data States
    const [isAssembled, setIsAssembled] = useState(!!unit.assembledAt)
    const [isPacked, setIsPacked] = useState(unit.isPacked)
    const [isSold, setIsSold] = useState(unit.isSold)
    const [marketplace, setMarketplace] = useState(unit.marketplace || '')
    const [customer, setCustomer] = useState(unit.customer || '')

    // Issue Tracking
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    })
    const activeIssue = unit.issues?.find((i: any) => !i.isResolved)
    const hasIssue = !!activeIssue

    useEffect(() => {
        if (unit.customId) setCustomId(unit.customId)
    }, [unit.customId])

    // Calculate if all sections are checked
    const isAllSectionsChecked = items.length > 0 && items.every(item => completedIds.includes(item.id))

    // Auto-uncheck Assembled, Packed and Sold when production progress is incomplete
    useEffect(() => {
        if (!isAllSectionsChecked && isAssembled) {
            setIsAssembled(false)
            handleSalesUpdate('isAssembled', false)
        }
    }, [isAllSectionsChecked])

    useEffect(() => {
        if (!isAssembled && isPacked) {
            setIsPacked(false)
            handleSalesUpdate('isPacked', false)
        }
    }, [isAssembled])

    useEffect(() => {
        if (!isPacked && isSold) {
            setIsSold(false)
            handleSalesUpdate('isSold', false)
            handleSalesUpdate('marketplace', '')
            handleSalesUpdate('customer', '')
            setMarketplace('')
            setCustomer('')
        }
    }, [isPacked])

    // Auto-clear marketplace and customer when Sold is unchecked
    useEffect(() => {
        if (!isSold) {
            // Optional: clear if needed, but usually we just keep it or clear on uncheck action
        }
    }, [isSold])

    const handleToggle = (itemId: string) => {
        const isCompleted = completedIds.includes(itemId)
        const newCompletedIds = isCompleted
            ? completedIds.filter(id => id !== itemId)
            : [...completedIds, itemId]

        setCompletedIds(newCompletedIds) // Optimistic update

        startTransition(async () => {
            await toggleUnitSection(unit.id, itemId, !isCompleted)
        })
    }

    // Identifier blur removed as it matches computed serial now

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

    const handleStatusToggle = (type: 'Assembled' | 'Packed' | 'Sold', currentValue: boolean) => {
        const nextValue = !currentValue

        if (nextValue === false) { // Unchecking requires confirmation
            setConfirmModal({
                isOpen: true,
                title: `Uncheck ${type}?`,
                message: `Are you sure you want to uncheck ${type}?\nThis action cannot be undone and might affect next steps.`,
                onConfirm: () => {
                    updateStatus(type, false)
                }
            })
        } else {
            updateStatus(type, true)
        }
    }

    const updateStatus = (type: string, value: boolean) => {
        if (type === 'Assembled') {
            setIsAssembled(value)
            handleSalesUpdate('isAssembled', value)
        } else if (type === 'Packed') {
            setIsPacked(value)
            handleSalesUpdate('isPacked', value)
        } else if (type === 'Sold') {
            setIsSold(value)
            handleSalesUpdate('isSold', value)
        }
    }

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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Yes, Uncheck"
                isDangerous={true}
            />

            <tr className={`border-b text-xs hover:bg-slate-50 transition-colors ${hasIssue ? 'bg-red-50 hover:bg-red-50' : ''}`}>
                <td className="p-1 border-r border-border bg-white text-center font-medium text-slate-500 sticky left-0 z-20 shadow-[1px_0_0_0_#E5E7EB]">
                    {activeIssue ? (
                        <button onClick={() => setIsIssueModalOpen(true)}>
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse mx-auto" />
                        </button>
                    ) : (
                        <div className="flex justify-center group relative">
                            <span className="cursor-default">{unit.unitNumber}</span>
                            <button
                                onClick={() => setIsIssueModalOpen(true)}
                                className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-200 rounded"
                                title="Report Issue"
                            >
                                <AlertCircle className="w-3 h-3 text-slate-400" />
                            </button>
                        </div>
                    )}
                </td>
                <td className="p-1 border-r border-border bg-white font-mono text-slate-600 text-center select-all sticky left-[45px] z-20 shadow-[1px_0_0_0_#E5E7EB]">
                    {/* Display Computed Serial */}
                    {computedSerial}
                </td>
                <td className="p-1 border-r border-border bg-white sticky left-[145px] z-20 shadow-[1px_0_0_0_#E5E7EB]">
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
                        <td key={item.id} className={`p-[3px] text-center border-r border-border ${item.colorClass ? item.colorClass + '/30' : ''}`}>
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
                                handleStatusToggle('Assembled', isAssembled)
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
                                handleStatusToggle('Packed', isPacked)
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
                                handleStatusToggle('Sold', isSold)
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
                        onBlur={() => handleSalesUpdate('marketplace', marketplace)}
                        placeholder="Marketplace"
                        className="w-full text-xs px-2 py-1 rounded border border-indigo-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none text-center bg-white/50"
                    />
                </td>
                <td className="px-2 py-1 bg-indigo-50/30">
                    <input
                        type="text"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                        onBlur={() => handleSalesUpdate('customer', customer)}
                        placeholder="Customer"
                        className="w-full text-xs px-2 py-1 rounded border border-indigo-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none text-center bg-white/50"
                    />
                </td>
            </tr>
        </>
    )
}

